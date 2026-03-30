export const getStudentAccessibleStructure = (structure = [], user = null) => {
    if (!user || user.role !== 'student') return [];

    const turma = structure.find((item) => item.id === user.turmaId);
    if (!turma) return [];

    const allowedTrailIds = user.allowedTrailIds || [];
    const allowedCourseIds = user.allowedCourseIds || [];

    const hasTrailRestriction = allowedTrailIds.length > 0;
    const hasCourseRestriction = allowedCourseIds.length > 0;

    if (!hasTrailRestriction && !hasCourseRestriction) {
        return [turma];
    }

    const filteredTrails = (turma.children || [])
        .filter((trail) => !hasTrailRestriction || allowedTrailIds.includes(trail.id))
        .map((trail) => {
            const filteredCourses = (trail.children || []).filter((course) => {
                if (!hasCourseRestriction) return true;
                return allowedCourseIds.includes(course.id);
            });

            return { ...trail, children: filteredCourses };
        })
        .filter((trail) => trail.children.length > 0 || !hasCourseRestriction);

    return [{ ...turma, children: filteredTrails }];
};

