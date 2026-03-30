import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    setDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { INITIAL_STRUCTURE } from '../utils/initialData';
import { getCachedValue, setCachedValue, clearCachedValue } from './cacheService';

const STRUCTURE_CACHE_KEY = 'edu_pro_structure_cache_v2';
const STRUCTURE_CACHE_TTL_MS = 30 * 1000; // 30 sec for instant updates
const BATCH_LIMIT = 400;

const STRUCTURE_COLLECTIONS = ['turmas', 'trails', 'courses', 'modules', 'lessons'];
const LEGACY_COLLECTION = 'structure';

const removeChildren = (node = {}) => {
    const cloned = { ...node };
    delete cloned.children;
    return cloned;
};

const createEmptyBuckets = () => ({
    turmas: [],
    trails: [],
    courses: [],
    modules: [],
    lessons: []
});

const flattenStructure = (tree = []) => {
    const buckets = createEmptyBuckets();

    const visitTurma = (turma, order) => {
        const turmaBase = removeChildren(turma);
        buckets.turmas.push({
            ...turmaBase,
            type: 'turma',
            order
        });

        (turma.children || []).forEach((trail, trailOrder) => visitTrail(trail, trailOrder, turma.id));
    };

    const visitTrail = (trail, order, turmaId) => {
        const trailBase = removeChildren(trail);
        buckets.trails.push({
            ...trailBase,
            type: 'trilha',
            parentTurmaId: turmaId,
            order
        });

        (trail.children || []).forEach((course, courseOrder) => visitCourse(course, courseOrder, turmaId, trail.id));
    };

    const visitCourse = (course, order, turmaId, trailId) => {
        const courseBase = removeChildren(course);
        buckets.courses.push({
            ...courseBase,
            type: 'curso',
            parentTurmaId: turmaId,
            parentTrailId: trailId,
            order
        });

        (course.children || []).forEach((moduleNode, moduleOrder) => visitModule(moduleNode, moduleOrder, turmaId, trailId, course.id));
    };

    const visitModule = (moduleNode, order, turmaId, trailId, courseId) => {
        const moduleBase = removeChildren(moduleNode);
        buckets.modules.push({
            ...moduleBase,
            type: 'modulo',
            parentTurmaId: turmaId,
            parentTrailId: trailId,
            parentCourseId: courseId,
            order
        });

        (moduleNode.children || []).forEach((lesson, lessonOrder) => {
            const lessonBase = removeChildren(lesson);
            buckets.lessons.push({
                ...lessonBase,
                parentTurmaId: turmaId,
                parentTrailId: trailId,
                parentCourseId: courseId,
                parentModuleId: moduleNode.id,
                order: lessonOrder
            });
        });
    };

    tree.forEach((turma, turmaOrder) => visitTurma(turma, turmaOrder));
    return buckets;
};

const sortByOrder = (a, b) => {
    const orderA = Number.isFinite(Number(a?.order)) ? Number(a.order) : 0;
    const orderB = Number.isFinite(Number(b?.order)) ? Number(b.order) : 0;
    return orderA - orderB;
};

const buildStructureTree = ({ turmas, trails, courses, modules, lessons }) => {
    const trailsByTurma = new Map();
    const coursesByTrail = new Map();
    const modulesByCourse = new Map();
    const lessonsByModule = new Map();

    trails.forEach((trail) => {
        const list = trailsByTurma.get(trail.parentTurmaId) || [];
        list.push(trail);
        trailsByTurma.set(trail.parentTurmaId, list);
    });

    courses.forEach((course) => {
        const list = coursesByTrail.get(course.parentTrailId) || [];
        list.push(course);
        coursesByTrail.set(course.parentTrailId, list);
    });

    modules.forEach((moduleNode) => {
        const list = modulesByCourse.get(moduleNode.parentCourseId) || [];
        list.push(moduleNode);
        modulesByCourse.set(moduleNode.parentCourseId, list);
    });

    lessons.forEach((lesson) => {
        const list = lessonsByModule.get(lesson.parentModuleId) || [];
        list.push(lesson);
        lessonsByModule.set(lesson.parentModuleId, list);
    });

    const tree = [...turmas]
        .sort(sortByOrder)
        .map((turma) => ({
            ...removeParentAndOrderFields(turma),
            children: (trailsByTurma.get(turma.id) || [])
                .sort(sortByOrder)
                .map((trail) => ({
                    ...removeParentAndOrderFields(trail),
                    children: (coursesByTrail.get(trail.id) || [])
                        .sort(sortByOrder)
                        .map((course) => ({
                            ...removeParentAndOrderFields(course),
                            children: (modulesByCourse.get(course.id) || [])
                                .sort(sortByOrder)
                                .map((moduleNode) => ({
                                    ...removeParentAndOrderFields(moduleNode),
                                    children: (lessonsByModule.get(moduleNode.id) || [])
                                        .sort(sortByOrder)
                                        .map((lesson) => removeParentAndOrderFields(lesson))
                                }))
                        }))
                }))
        }));

    return tree;
};

const removeParentAndOrderFields = (node = {}) => {
    const cloned = { ...node };
    delete cloned.parentTurmaId;
    delete cloned.parentTrailId;
    delete cloned.parentCourseId;
    delete cloned.parentModuleId;
    delete cloned.order;
    return cloned;
};

const loadCollectionData = async (collectionName) => {
    const q = query(collection(db, collectionName), orderBy('order'));
    const snap = await getDocs(q);
    return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
};

const loadNormalizedStructure = async () => {
    const [turmas, trails, courses, modules, lessons] = await Promise.all([
        loadCollectionData('turmas'),
        loadCollectionData('trails'),
        loadCollectionData('courses'),
        loadCollectionData('modules'),
        loadCollectionData('lessons')
    ]);

    if (!turmas.length) return [];
    return buildStructureTree({ turmas, trails, courses, modules, lessons });
};

const loadLegacyStructure = async () => {
    const legacySnap = await getDocs(collection(db, LEGACY_COLLECTION));
    if (legacySnap.empty) return [];
    return legacySnap.docs.map((item) => ({ id: item.id, ...item.data() }));
};

const chunkArray = (items = [], chunkSize = BATCH_LIMIT) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
};

const clearCollections = async (collectionNames = STRUCTURE_COLLECTIONS) => {
    for (const name of collectionNames) {
        const snap = await getDocs(collection(db, name));
        if (snap.empty) continue;

        const docRefs = snap.docs.map((item) => item.ref);
        const chunks = chunkArray(docRefs, BATCH_LIMIT);

        for (const group of chunks) {
            const batch = writeBatch(db);
            group.forEach((ref) => batch.delete(ref));
            await batch.commit();
        }
    }
};

export const persistNormalizedStructure = async (tree = []) => {
    const buckets = flattenStructure(tree);
    await clearCollections();

    const allSetOps = [];
    Object.entries(buckets).forEach(([collectionName, items]) => {
        items.forEach((item) => {
            allSetOps.push({
                collectionName,
                id: item.id,
                data: item
            });
        });
    });

    const chunks = chunkArray(allSetOps, BATCH_LIMIT);
    for (const group of chunks) {
        const batch = writeBatch(db);
        group.forEach((op) => {
            batch.set(doc(db, op.collectionName, op.id), op.data, { merge: false });
        });
        await batch.commit();
    }

    setCachedValue(STRUCTURE_CACHE_KEY, tree);
};

export const invalidateStructureCache = () => {
    clearCachedValue(STRUCTURE_CACHE_KEY);
};

const hasSeededBefore = async () => {
    const seedDoc = await getDoc(doc(db, 'system_config', 'db_structure_seeding'));
    return seedDoc.exists() && seedDoc.data().seeded === true;
};

const markAsSeeded = async () => {
    await setDoc(doc(db, 'system_config', 'db_structure_seeding'), { seeded: true, timestamp: new Date() }, { merge: true });
};

const ensureSeededStructure = async () => {
    const normalized = await loadNormalizedStructure();
    
    // If we have data, we are seeded. Mark it just in case.
    if (normalized.length) {
        await markAsSeeded();
        return normalized;
    }

    // Completely empty. Check if admin deleted everything intentionally.
    const isSeeded = await hasSeededBefore();
    if (isSeeded) {
        return []; // It's empty because the admin deleted everything. Do not restore!
    }

    // Fresh install. Try legacy first.
    const legacy = await loadLegacyStructure();
    if (legacy.length) {
        try {
            await persistNormalizedStructure(legacy);
            await markAsSeeded();
        } catch (error) {
            console.warn('Could not migrate legacy structure to normalized collections:', error);
        }
        return legacy;
    }

    // Fallback to INITIAL_STRUCTURE
    try {
        await persistNormalizedStructure(INITIAL_STRUCTURE);
        await markAsSeeded();
    } catch (error) {
        console.warn('Could not seed normalized structure:', error);
    }

    // Backward compatibility for any old screen still reading legacy collection.
    try {
        await Promise.all(INITIAL_STRUCTURE.map((item) => setDoc(doc(db, LEGACY_COLLECTION, item.id), item)));
    } catch (error) {
        console.warn('Could not seed legacy structure collection:', error);
    }
    return INITIAL_STRUCTURE;
};

export const publishMegaCatalog = async (tree) => {
    try {
        await setDoc(doc(db, 'system_config', 'public_catalog'), {
            catalog: tree,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log("Mega Catalog successfully published");
    } catch (e) {
        console.error("Failed to publish Mega Catalog", e);
    }
};

export const loadStructureTree = async ({ forceRefresh = false, bypassCatalog = false } = {}) => {
    if (!forceRefresh) {
        const cached = getCachedValue(STRUCTURE_CACHE_KEY, STRUCTURE_CACHE_TTL_MS);
        if (cached) return cached;
    }

    // --- MEGA CATALOG FAST READ (CQRS Level 2) ---
    if (!bypassCatalog) {
        try {
            const catalogDoc = await getDoc(doc(db, 'system_config', 'public_catalog'));
            if (catalogDoc.exists()) {
                const data = catalogDoc.data().catalog;
                if (data && Array.isArray(data) && data.length > 0) {
                    setCachedValue(STRUCTURE_CACHE_KEY, data);
                    return data;
                }
            }
        } catch (e) {
            console.warn("Failed to read Mega Catalog, falling back to normalized collections:", e);
        }
    }

    // --- MULTI-READ NORMALIZED FALLBACK ---
    const normalized = await loadNormalizedStructure();
    if (normalized.length) {
        setCachedValue(STRUCTURE_CACHE_KEY, normalized);
        publishMegaCatalog(normalized); // Seed the mega catalog for next time
        return normalized;
    }

    const seeded = await ensureSeededStructure();
    setCachedValue(STRUCTURE_CACHE_KEY, seeded);
    publishMegaCatalog(seeded); // Seed the mega catalog for next time
    return seeded;
};

// ======================================
// PROFESSIONAL CRUD ATOMIC OPERATIONS
// ======================================

const collectionMap = {
    'turma': 'turmas',
    'trilha': 'trails',
    'curso': 'courses',
    'modulo': 'modules',
    'aula': 'lessons',
    'quiz': 'lessons'
};

export const saveStructureItem = async (item, path, orderIndex = 0) => {
    const data = { ...item, order: orderIndex };
    delete data.children; // Do not nest children in DB

    if (path[0]) data.parentTurmaId = path[0].id;
    if (path[1]) data.parentTrailId = path[1].id;
    if (path[2]) data.parentCourseId = path[2].id;
    if (path[3]) data.parentModuleId = path[3].id;

    const colName = collectionMap[item.type];
    if (!colName) throw new Error("Item type unrecognized: " + item.type);

    await setDoc(doc(db, colName, item.id), data, { merge: true });
};

const addCascadeDeletes = async (batch, collectionName, parentField, parentId) => {
    const q = query(collection(db, collectionName), where(parentField, "==", parentId));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => batch.delete(d.ref));
};

export const deleteStructureItem = async (item) => {
    const batch = writeBatch(db);
    const colName = collectionMap[item.type];
    if (!colName) return;

    // 1. Delete main item
    batch.delete(doc(db, colName, item.id));

    // 2. Cascade delete dependent sub-items to keep DB clean and prevent ghosts
    if (item.type === 'turma') {
        await addCascadeDeletes(batch, 'trails', 'parentTurmaId', item.id);
        await addCascadeDeletes(batch, 'courses', 'parentTurmaId', item.id);
        await addCascadeDeletes(batch, 'modules', 'parentTurmaId', item.id);
        await addCascadeDeletes(batch, 'lessons', 'parentTurmaId', item.id);
    } else if (item.type === 'trilha') {
        await addCascadeDeletes(batch, 'courses', 'parentTrailId', item.id);
        await addCascadeDeletes(batch, 'modules', 'parentTrailId', item.id);
        await addCascadeDeletes(batch, 'lessons', 'parentTrailId', item.id);
    } else if (item.type === 'curso') {
        await addCascadeDeletes(batch, 'modules', 'parentCourseId', item.id);
        await addCascadeDeletes(batch, 'lessons', 'parentCourseId', item.id);
    } else if (item.type === 'modulo') {
        await addCascadeDeletes(batch, 'lessons', 'parentModuleId', item.id);
    }

    await batch.commit();
};
