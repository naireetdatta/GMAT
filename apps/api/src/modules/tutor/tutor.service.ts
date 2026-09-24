import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiOrchestratorService, AIMessage } from '../ai/ai-orchestrator.service';
import { TutorMode } from '@prisma/client';

@Injectable()
export class TutorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiOrchestrator: AiOrchestratorService,
  ) {}

  async createSession(userId: string, mode: TutorMode, title?: string) {
    return this.prisma.tutorSession.create({
      data: {
        userId,
        mode,
        title: title || `GMAT Tutor Session - ${mode}`,
        messages: [] as any,
        context: {},
      },
    });
  }

  async getSessions(userId: string) {
    return this.prisma.tutorSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.tutorSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(`Tutor session ${sessionId} not found`);
    }

    return session;
  }

  async sendMessage(userId: string, sessionId: string, content: string) {
    const session = await this.getSession(userId, sessionId);

    const messages = (session.messages as unknown as AIMessage[]) || [];

    // System prompt tailored to GMAT Focus and TutorMode
    const systemPrompt = this.getSystemPromptForMode(session.mode);

    // Prepare message payload
    const apiMessages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
      { role: 'user', content },
    ];

    // Get response from AI orchestrator
    const aiResponse = await this.aiOrchestrator.chat('tutor', apiMessages, {
      temperature: 0.7,
    });

    // Update messages in database
    const updatedMessages = [
      ...messages,
      { role: 'user', content },
      { role: 'assistant', content: aiResponse.content },
    ];

    return this.prisma.tutorSession.update({
      where: { id: sessionId },
      data: {
        messages: updatedMessages as any,
      },
    });
  }

  private getSystemPromptForMode(mode: TutorMode): string {
    const basePrompt = `You are a highly skilled, expert GMAT Focus Edition Tutor. The GMAT Focus Edition consists of three sections: Quantitative Reasoning (Arithmetic, Algebra, Word Problems, statistics - NO geometry), Verbal Reasoning (Critical Reasoning, Reading Comprehension), and Data Insights (Data Sufficiency, Table Analysis, Graphics Interpretation, Multi-Source Reasoning, Two-Part Analysis).

Help the student understand GMAT Focus concepts, solve practice questions, and identify traps. Always use professional, encouraging language, clear Markdown formatting, and LaTeX format for math formulas (wrap math expressions in $ or $$).`;

    switch (mode) {
      case TutorMode.BEGINNER:
        return `${basePrompt}\nYour mode is BEGINNER. Break down problems step-by-step using fundamental concepts. Explain core terminology, do not skip algebra steps, and emphasize understanding the "why" before showing shortcut formulas.`;
      case TutorMode.INTERMEDIATE:
        return `${basePrompt}\nYour mode is INTERMEDIATE. Focus on explaining both the core math/logic and standard GMAT shortcuts. Discuss speed optimization, common trap choices, and how to eliminate incorrect options.`;
      case TutorMode.EXPERT:
        return `${basePrompt}\nYour mode is EXPERT. Dive straight into high-level, advanced strategies. Highlight subtle nuance, extreme level 700+ question styles, alternative setups, and meta-cognitive exam-taking processes.`;
      case TutorMode.VISUAL:
        return `${basePrompt}\nYour mode is VISUAL. Use visual diagrams structured via ASCII art or Markdown tables where possible. Structure explanations into distinct visual blocks or flowcharts to represent logical branching.`;
      case TutorMode.COACH:
        return `${basePrompt}\nYour mode is COACH. Act like a study counselor and mentor. Encourage regular pacing, suggest structural changes to study plans, offer stress management tips, and provide constructive performance feedback based on student queries.`;
      default:
        return basePrompt;
    }
  }
}
