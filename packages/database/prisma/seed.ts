import { PrismaClient, Role, AuthProvider, SectionType, QuestionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding GMAT Focus platform database...');

  // 1. Create default admin and student users
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmatprep.ai' },
    update: {},
    create: {
      email: 'admin@gmatprep.ai',
      name: 'Principal Architect',
      passwordHash,
      role: Role.ADMIN,
      provider: AuthProvider.CREDENTIALS,
      preferences: {},
    },
  });
  console.log(`Created admin: ${admin.email}`);

  const student = await prisma.user.upsert({
    where: { email: 'student@gmatprep.ai' },
    update: {},
    create: {
      email: 'student@gmatprep.ai',
      name: 'Jane Doe',
      passwordHash,
      role: Role.STUDENT,
      provider: AuthProvider.CREDENTIALS,
      preferences: {},
    },
  });
  console.log(`Created student: ${student.email}`);

  // 2. Seed default questions for all sections
  console.log('Seeding question pool...');

  const seedQuestions = [
    // --- Quantitative reasoning ---
    {
      section: SectionType.QUANTITATIVE,
      type: QuestionType.PROBLEM_SOLVING,
      topic: 'Algebra',
      subtopic: 'Quadratic Equations',
      difficulty: 650,
      stem: 'If x² - 5x + 6 = 0, and x is the larger root of the equation, what is the value of 3x + 4?',
      options: [
        { id: 'A', label: 'A', text: '10' },
        { id: 'B', label: 'B', text: '11' },
        { id: 'C', label: 'C', text: '13' },
        { id: 'D', label: 'D', text: '14' },
        { id: 'E', label: 'E', text: '16' },
      ],
      correctAnswer: 'C', // larger root is 3. 3(3)+4 = 13.
      explanation: {
        stepByStep: '1. Factor x² - 5x + 6 = 0 into (x - 2)(x - 3) = 0.\n2. The roots are x = 2 and x = 3.\n3. The larger root is x = 3.\n4. Calculate 3(3) + 4 = 13.',
        fasterMethod: 'Look at the product of roots (6) and sum of roots (5). Roots must be 2 and 3. The larger is 3. Evaluate 3(3)+4 = 13.',
        wrongOptionExplanations: {
          A: 'Used x=2: 3(2)+4 = 10 (the smaller root).',
          B: 'Calculation slip.',
          D: 'Calculation slip.',
          E: 'Calculation slip.',
        },
        commonMistakes: ['Selecting the smaller root x=2.', 'Solving error.'],
        relatedConcepts: ['Factoring quadratics', 'Root evaluation'],
      },
      validated: true,
      validationScore: 98,
      irtDifficulty: 0.5,
      irtDiscrimination: 1.2,
      irtGuessing: 0.2,
    },
    {
      section: SectionType.QUANTITATIVE,
      type: QuestionType.PROBLEM_SOLVING,
      topic: 'Arithmetic',
      subtopic: 'Ratios',
      difficulty: 550,
      stem: 'A box contains red, blue, and green marbles in the ratio 3 : 4 : 5. If there are 36 marbles in total, how many blue marbles are in the box?',
      options: [
        { id: 'A', label: 'A', text: '9' },
        { id: 'B', label: 'B', text: '12' },
        { id: 'C', label: 'C', text: '15' },
        { id: 'D', label: 'D', text: '18' },
        { id: 'E', label: 'E', text: '24' },
      ],
      correctAnswer: 'B', // 4 / (3+4+5) * 36 = 12.
      explanation: {
        stepByStep: '1. Sum the ratio parts: 3 + 4 + 5 = 12.\n2. Divide total marbles by sum of parts to find part size: 36 / 12 = 3.\n3. Multiply blue ratio part by part size: 4 * 3 = 12.',
        fasterMethod: 'Blue represents 4/12 = 1/3 of total. 1/3 of 36 is 12.',
        wrongOptionExplanations: {
          A: 'Calculated red marbles (3 * 3 = 9).',
          C: 'Calculated green marbles (5 * 3 = 15).',
          D: 'Calculation slip.',
          E: 'Calculation slip.',
        },
        commonMistakes: ['Finding red or green marbles instead of blue.'],
        relatedConcepts: ['Ratio calculations', 'Proportional sharing'],
      },
      validated: true,
      validationScore: 95,
      irtDifficulty: -0.2,
      irtDiscrimination: 1.0,
      irtGuessing: 0.2,
    },

    // --- Verbal reasoning ---
    {
      section: SectionType.VERBAL,
      type: QuestionType.CRITICAL_REASONING,
      topic: 'Critical Reasoning',
      subtopic: 'Strengthen the Argument',
      difficulty: 680,
      stem: 'Company X implemented a remote-work policy last year, and their profits increased by 15%. Therefore, remote work policies lead to higher corporate profits. Which of the following, if true, most strengthens the argument?',
      options: [
        { id: 'A', label: 'A', text: 'Most employees at Company X preferred remote work over office work.' },
        { id: 'B', label: 'B', text: 'Company X reduced office space expenditures by 30% after implementing the policy.' },
        { id: 'C', label: 'C', text: 'Other companies that did not implement remote-work policies experienced flat profit growth.' },
        { id: 'D', label: 'D', text: 'Company X hired a new CEO during the same year.' },
        { id: 'E', label: 'E', text: 'Workplace productivity metrics are difficult to quantify accurately.' },
      ],
      correctAnswer: 'C', // Control group strengthener: shows that flat profit happened without the policy. (B is good, but C directly strengthens causal claim by control). Let's explain why C is best.
      explanation: {
        stepByStep: 'The argument makes a causal claim: remote-work (cause) -> profits increase (effect). To strengthen a causal claim, we can show that when the cause is absent, the effect is absent (a control group). Option C provides this by showing companies without remote-work had flat growth.',
        fasterMethod: 'Identify causal assumptions. Eliminate options that introduce alternative causes (like D, which weakens by suggesting the new CEO caused the profits).',
        wrongOptionExplanations: {
          A: 'Employee preference does not establish causal link to profits.',
          B: 'Explains a potential cost saving, but is weaker than establishing direct general causation across markets.',
          D: 'Weakens the argument by suggesting an alternative cause (new CEO).',
          E: 'Out of scope / irrelevant.',
        },
        commonMistakes: ['Selecting B which only details a mechanism rather than validating the causal correlation.'],
        relatedConcepts: ['Causal reasoning', 'Control groups'],
      },
      validated: true,
      validationScore: 97,
      irtDifficulty: 0.8,
      irtDiscrimination: 1.3,
      irtGuessing: 0.2,
    },

    // --- Data Insights ---
    {
      section: SectionType.DATA_INSIGHTS,
      type: QuestionType.DATA_SUFFICIENCY,
      topic: 'Data Sufficiency',
      subtopic: 'Number Properties',
      difficulty: 600,
      stem: 'Is the integer n positive?\n\n(1) n³ > 0\n(2) n² - n > 0',
      options: [
        { id: 'A', label: 'A', text: 'Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.' },
        { id: 'B', label: 'B', text: 'Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient.' },
        { id: 'C', label: 'C', text: 'BOTH statements TOGETHER are sufficient, but NEITHER statement ALONE is sufficient.' },
        { id: 'D', label: 'D', text: 'EACH statement ALONE is sufficient.' },
        { id: 'E', label: 'E', text: 'Statements (1) and (2) TOGETHER are NOT sufficient.' },
      ],
      correctAnswer: 'A', // (1) n^3 > 0 means n must be positive. Sufficient. (2) n(n-1) > 0 means n > 1 or n < 0. Can be positive or negative. Insufficient.
      explanation: {
        stepByStep: '1. Evaluate (1): n³ > 0. Since the cube of a negative number is negative, n must be positive. This statement alone is sufficient.\n2. Evaluate (2): n(n - 1) > 0. This is true if n > 1 or n < 0. Thus, n could be positive (e.g. 2) or negative (e.g. -1). This statement is not sufficient.',
        fasterMethod: 'Recall that odd powers preserve the sign of the base. Thus n³ > 0 directly implies n > 0.',
        wrongOptionExplanations: {
          B: 'Mistakenly assumes (2) is sufficient.',
          C: 'Assumes both are needed, but (1) is sufficient on its own.',
          D: 'Mistakenly assumes (2) is sufficient.',
          E: 'Assumes (1) is not sufficient.',
        },
        commonMistakes: ['Assuming (2) implies n is positive without considering negative integer values.'],
        relatedConcepts: ['Inequalities', 'Odd/Even powers'],
      },
      validated: true,
      validationScore: 99,
      irtDifficulty: 0.2,
      irtDiscrimination: 1.4,
      irtGuessing: 0.2,
    }
  ];

  for (const q of seedQuestions) {
    await prisma.question.create({
      data: {
        section: q.section,
        type: q.type,
        topic: q.topic,
        subtopic: q.subtopic,
        difficulty: q.difficulty,
        stem: q.stem,
        options: q.options as any,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation as any,
        validated: q.validated,
        validationScore: q.validationScore,
        irtDifficulty: q.irtDifficulty,
        irtDiscrimination: q.irtDiscrimination,
        irtGuessing: q.irtGuessing,
      },
    });
  }

  console.log('Seeded practice questions successfully.');
  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
