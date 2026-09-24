import { IrtService } from './irt.service';

describe('IrtService (Psychometric 3PL & CAT Engine Tests)', () => {
  let irtService: IrtService;

  beforeEach(() => {
    irtService = new IrtService();
  });

  describe('1. 3-Parameter Logistic (3PL) Probability', () => {
    it('should calculate correct probability at theta = b', () => {
      // When theta = b, exp(0) = 1. P(theta) = c + (1 - c) / 2
      const a = 1.0;
      const b = 0.0;
      const c = 0.2;
      const p = irtService.probability(0.0, a, b, c);
      expect(p).toBeCloseTo(0.2 + 0.8 / 2, 4); // 0.60
    });

    it('should approach guessing parameter c as theta -> -Infinity', () => {
      const p = irtService.probability(-10.0, 1.5, 0.0, 0.2);
      expect(p).toBeCloseTo(0.2, 2);
    });

    it('should approach 1.0 as theta -> +Infinity', () => {
      const p = irtService.probability(10.0, 1.5, 0.0, 0.2);
      expect(p).toBeCloseTo(1.0, 2);
    });
  });

  describe('2. Fisher Information', () => {
    it('should be highest near item difficulty b', () => {
      const a = 1.5;
      const b = 0.5;
      const c = 0.2;

      const infoAtB = irtService.fisherInformation(b, a, b, c);
      const infoFarLow = irtService.fisherInformation(b - 2.5, a, b, c);
      const infoFarHigh = irtService.fisherInformation(b + 2.5, a, b, c);

      expect(infoAtB).toBeGreaterThan(infoFarLow);
      expect(infoAtB).toBeGreaterThan(infoFarHigh);
    });
  });

  describe('3. Bayesian EAP Ability Estimation', () => {
    it('should return prior mean (0) when response string is empty', () => {
      const ability = irtService.estimateAbility([]);
      expect(ability).toBe(0);
    });

    it('should yield positive ability when student answers correctly', () => {
      const responses = [
        { correct: true, difficulty: 0.0, discrimination: 1.2, guessing: 0.2 },
        { correct: true, difficulty: 0.5, discrimination: 1.4, guessing: 0.2 },
        { correct: true, difficulty: 1.0, discrimination: 1.1, guessing: 0.2 },
      ];
      const ability = irtService.estimateAbility(responses);
      expect(ability).toBeGreaterThan(0.5);
    });

    it('should yield negative ability when student answers incorrectly', () => {
      const responses = [
        { correct: false, difficulty: 0.0, discrimination: 1.2, guessing: 0.2 },
        { correct: false, difficulty: -0.5, discrimination: 1.4, guessing: 0.2 },
        { correct: false, difficulty: -1.0, discrimination: 1.1, guessing: 0.2 },
      ];
      const ability = irtService.estimateAbility(responses);
      expect(ability).toBeLessThan(-0.5);
    });

    it('should NOT diverge to infinity for all-correct or all-wrong (EAP stability)', () => {
      const allCorrect = Array.from({ length: 20 }, (_, i) => ({
        correct: true,
        difficulty: -1 + i * 0.1,
        discrimination: 1.2,
        guessing: 0.2,
      }));

      const theta = irtService.estimateAbility(allCorrect);
      expect(theta).toBeLessThanOrEqual(3.0);
      expect(theta).toBeGreaterThan(1.0);
      expect(isFinite(theta)).toBe(true);
    });
  });

  describe('4. Standard Error of Measurement (SEM)', () => {
    it('should decrease as more informative items are answered', () => {
      const oneItem = [{ difficulty: 0.0, discrimination: 1.2, guessing: 0.2 }];
      const tenItems = Array.from({ length: 10 }, () => ({
        difficulty: 0.0,
        discrimination: 1.2,
        guessing: 0.2,
      }));

      const semOne = irtService.calculateSEM(0.0, oneItem);
      const semTen = irtService.calculateSEM(0.0, tenItems);

      expect(semTen).toBeLessThan(semOne);
    });
  });

  describe('5. Maximum Fisher Information Item Selection', () => {
    it('should select the question providing the most information at current theta', () => {
      const items = [
        { id: 'item-easy', difficulty: -2.0, discrimination: 1.0, guessing: 0.2, topic: 'Algebra' },
        { id: 'item-match', difficulty: 1.0, discrimination: 1.5, guessing: 0.2, topic: 'Algebra' },
        { id: 'item-hard', difficulty: 3.0, discrimination: 1.0, guessing: 0.2, topic: 'Algebra' },
      ];

      const bestItem = irtService.selectNextItem(1.0, items, new Set());
      expect(bestItem).toBeDefined();
      expect(bestItem?.id).toBe('item-match');
    });
  });
});
