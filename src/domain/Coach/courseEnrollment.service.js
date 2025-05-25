/* eslint-disable eqeqeq */
// services/courseEnrollment.service.js
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');

const Coach = require('./coach.model');
const CoachCourseProgram = require('../Admin/coach/coachCourseProgram/coach_course_program.model');

const DAYS_PER_SUBJECT = 1; // Can be adjusted as needed

class CourseEnrollmentService {
  static async enrollCoach(coachId, coachCourseProgramId) {
    // check if coachCourseProgram is exist
    const coachCourseProgram = await CoachCourseProgram.findById(coachCourseProgramId);
    if (!coachCourseProgram) {
      throw new ApiError(httpStatus.NOT_FOUND, 'coachCourseProgram not found');
    }

    // check if Coach is exist
    const coach = await Coach.findById(coachId);
    if (!coach) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Coach not found');
    }

    // Check if already enrolled
    const alreadyEnrolled = coach.enrolledCourses.some((ec) => ec.coach_course_program_id.equals(coachCourseProgramId));
    if (alreadyEnrolled) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Coach is already enrolled in this course');
    }

    // Calculate expiry dates for each subject
    const enrolledAt = new Date();
    const subjectProgress = coachCourseProgram.course_object.map((subject, index) => {
      const expireDate = new Date(enrolledAt);
      expireDate.setDate(expireDate.getDate() + (index + 1) * DAYS_PER_SUBJECT);
      expireDate.setHours(23, 59, 59, 999);

      return {
        subjectId: subject._id,
        order: subject.order || index,
        expireDate,
        isCompleted: false,
      };
    });

    // Sort by order
    subjectProgress.sort((a, b) => a.order - b.order);

    const enrolledCourse = {
      coach_course_program_id: coachCourseProgramId,
      enrolled_at: enrolledAt,
      completedSubjects: subjectProgress,
      currentSubjectIndex: 0,
      is_active: true,
    };

    coach.enrolledCourses.push(enrolledCourse);
    coach.access_level_request = coachCourseProgram.title;
    await coach.save();

    return coach;
  }

  static async completeSubject(coachId, coachCourseProgramId, subjectId, examResults) {
    // check if coach exist
    const coach = await Coach.findById(coachId);
    if (!coach) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Coach not found');
    }

    // check if coachCourseProgram is exist
    const coachCourseProgramDoc = await CoachCourseProgram.findById(coachCourseProgramId);
    if (!coachCourseProgramDoc) {
      throw new ApiError(httpStatus.NOT_FOUND, 'coachCourseProgram not found');
    }

    // eslint-disable-next-line eqeqeq
    const currentSubjectFromProgram = coachCourseProgramDoc.course_object.find((item) => item._id == subjectId);

    const enrolledCourse = coach.enrolledCourses.find((ec) => ec.coach_course_program_id.equals(coachCourseProgramId));

    // check if this coach course program enrolled or not
    if (!enrolledCourse) {
      throw new Error('Course not found for this coach');
    }

    const subjectProgress = enrolledCourse.completedSubjects.find((cs) => cs.subjectId.equals(subjectId));

    // NOTE: we have 2 type data 1- currentSubjectFromProgram and 2- subjectProgress
    // `subjectProgress` is come from Coach Doc that includes data related to the coach
    // like coach result for the exam or course progress

    // `currentSubjectFromProgram` is come from `CoachCourseProgram` Document from Admin section
    // that includes data like course information, video file and exam

    // check if this course subject exist
    if (!subjectProgress) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Subject not found in course');
    }

    // Check if subject is already completed
    if (subjectProgress.isCompleted) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Subject already completed');
    }

    // Check if subject is expired
    if (new Date() > subjectProgress.expireDate) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Subject is expired');
    }

    // Update subject progress
    subjectProgress.isCompleted = true;
    subjectProgress.completedAt = new Date();

    // calculate exam Result
    if (!examResults || !Array.isArray(examResults)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Exam Result Have Wrong Format ');
    }

    const examAnswersData = [];

    /**  `getTheQuestionCorrectAnswer` helper function
        @params questionId (ObjectId)
        @params selectedOptionId (ObjectId)  user selected test answer option as id
        @params subject

        this function find the question in the selected subject by question id
        then check if `option` exist or not , if there is not any obtion with defined `selectedOptionIUd`
        return 0

        if find the question option, if the selectedOption was the correct one, return
        the `score` of the question from subject property , if not return 0

        @return int
        result === 0 => selectedOption not exist or is wrong answer
        result > 0 => selectedOption is correct and return the score of the that specific
        question
    */
    const getTheQuestionCorrectAnswer = ({ questionId, selectedOptionId, subject }) => {
      // find questionId in course_object[ID].exam (subject)
      // eslint-disable-next-line eqeqeq
      const question = subject.exam.find((q) => q._id == questionId);
      if (!question) return 0;

      // corect test answer
      const correctAnswer = question.options.find((opt) => opt.isCorrect == true);

      if (selectedOptionId == correctAnswer._id) {
        return question.points;
      }

      return 0;
    };

    // eslint-disable-next-line no-plusplus

    let score = 0;
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < examResults.length; i++) {
      if (examResults[i].questionId && examResults[i].selectedOptionId) {
        const isCorrectOption = getTheQuestionCorrectAnswer({
          questionId: examResults[i].questionId,
          selectedOptionId: examResults[i].selectedOptionId,
          subject: currentSubjectFromProgram,
        });

        if (isCorrectOption !== 0) {
          score += isCorrectOption;
        }
        examAnswersData.push({
          questionId: examResults[i].questionId,
          selectedOptionId: examResults[i].selectedOptionId,
          isCorrect: isCorrectOption !== 0,
        });
      }
    }

    // return { examAnswersData, score };

    subjectProgress.examScore = score; // int
    /**
     * examAnswers: [
    {
      questionId: Schema.Types.ObjectId,
      selectedOptionId: Schema.Types.ObjectId,
      isCorrect: Boolean,
    },
  ],
     */
    // subjectProgress.examAnswers = examResults.answers;
    subjectProgress.examAnswers = examAnswersData;

    // Move to next subject if available
    if (enrolledCourse.currentSubjectIndex < enrolledCourse.completedSubjects.length - 1) {
      enrolledCourse.currentSubjectIndex += 1;
    }

    await coach.save();
    return coach;
  }

  static async getCurrentSubject(coachId, coachCourseProgramId) {
    // check if coach exist
    const coach = await Coach.findById(coachId);
    if (!coach) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Coach not found');
    }

    // check if coachCourseProgram exist
    const enrolledCourse = coach.enrolledCourses.find((ec) => ec.coach_course_program_id.equals(coachCourseProgramId));
    if (!enrolledCourse) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Course not found for this coach');
    }

    const currentSubject = enrolledCourse.completedSubjects[enrolledCourse.currentSubjectIndex];
    return {
      subject: currentSubject,
      course: enrolledCourse,
    };
  }
}

module.exports = CourseEnrollmentService;
