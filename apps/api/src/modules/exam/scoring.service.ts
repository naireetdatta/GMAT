import { Injectable } from '@nestjs/common';

@Injectable()
export class ScoringService {
  /**
   * Convert IRT theta to GMAT section score (60-90)
   */
  calculateSectionScore(theta: number): number {
    const thetaMin = -3.0;
    const thetaMax = 3.0;
    const scoreMin = 60;
    const scoreMax = 90;

    // Clamp theta
    const clampedTheta = Math.max(thetaMin, Math.min(thetaMax, theta));

    // Linear mapping
    const normalized = (clampedTheta - thetaMin) / (thetaMax - thetaMin);
    const score = scoreMin + normalized * (scoreMax - scoreMin);

    return Math.round(score);
  }

  /**
   * Calculate total GMAT score (205-805) from section scores
   * All three sections contribute equally
   * Score is in 10-point increments
   */
  calculateTotalScore(quantScore: number, verbalScore: number, diScore: number): number {
    // Each section is scored 60-90
    // Total score range: 205-805
    // Equal weighting of all three sections

    const avgSectionScore = (quantScore + verbalScore + diScore) / 3;

    // Map average section score (60-90) to total score (205-805)
    const normalized = (avgSectionScore - 60) / (90 - 60);
    const rawScore = 205 + normalized * (805 - 205);

    // Round to nearest 10
    const roundedScore = Math.round(rawScore / 10) * 10;

    // Clamp to valid range
    return Math.max(205, Math.min(805, roundedScore));
  }

  /**
   * Calculate percentile from total score
   * Based on approximate GMAT score distribution
   */
  calculatePercentile(totalScore: number): number {
    // Approximate percentile mapping based on real GMAT distribution
    const percentileMap: [number, number][] = [
      [805, 99],
      [785, 99],
      [765, 98],
      [745, 96],
      [725, 94],
      [705, 90],
      [685, 85],
      [665, 79],
      [645, 72],
      [625, 64],
      [605, 56],
      [585, 48],
      [565, 40],
      [545, 33],
      [525, 26],
      [505, 21],
      [485, 16],
      [465, 12],
      [445, 9],
      [425, 7],
      [405, 5],
      [385, 3],
      [365, 2],
      [345, 1],
      [205, 0],
    ];

    // Find the closest score bracket
    for (const [score, percentile] of percentileMap) {
      if (totalScore >= score) {
        return percentile;
      }
    }

    return 0;
  }
}
