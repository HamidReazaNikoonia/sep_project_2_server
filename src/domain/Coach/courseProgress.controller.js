// controllers/courseProgress.controller.js
const CourseEnrollmentService = require('./courseEnrollment.service');

exports.enrollInCourse = async (req, res) => {
  try {
    const { coachId } = req.params;
    const { coachCourseProgramId } = req.body;

    const result = await CourseEnrollmentService.enrollCoach(coachId, coachCourseProgramId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.completeSubject = async (req, res) => {
  try {
    const { coachId, coachCourseProgramId, subjectId } = req.params;
    const { examResults } = req.body;

    const result = await CourseEnrollmentService.completeSubject(coachId, coachCourseProgramId, subjectId, examResults);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getCurrentSubject = async (req, res) => {
  try {
    const { coachId, coachCourseProgramId } = req.params;


    console.log('kir-coachCourseProgramId', coachCourseProgramId);

    const result = await CourseEnrollmentService.getCurrentSubject(coachId, coachCourseProgramId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
