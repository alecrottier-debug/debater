import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PerplexityService } from './perplexity.service.js';
import { PersonaSynthesisService } from './persona-synthesis.service.js';

@Injectable()
export class PersonasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perplexityService: PerplexityService,
    private readonly synthesisService: PersonaSynthesisService,
  ) {}

  findAllTemplates() {
    return this.prisma.persona.findMany({
      where: { isTemplate: true },
      orderBy: { name: 'asc' },
    });
  }

  findAll() {
    return this.prisma.persona.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createPersona(data: {
    name: string;
    tagline: string;
    personaJson: object;
    isTemplate?: boolean;
  }) {
    if (!data.name?.trim()) {
      throw new BadRequestException('Name is required');
    }
    if (!data.tagline?.trim()) {
      throw new BadRequestException('Tagline is required');
    }
    return this.prisma.persona.create({
      data: {
        name: data.name.trim(),
        tagline: data.tagline.trim(),
        personaJson: data.personaJson,
        isTemplate: data.isTemplate ?? false,
      },
    });
  }

  async research(subject: string, context?: string) {
    if (!subject?.trim()) {
      throw new BadRequestException('Subject is required');
    }

    const { rawResponse, summary, query } = await this.perplexityService.research(
      subject.trim(),
      context?.trim(),
    );

    const dossier = await this.prisma.researchDossier.create({
      data: {
        query,
        subject: subject.trim(),
        rawResponse: rawResponse as object,
        summary,
      },
    });

    return {
      dossierId: dossier.id,
      subject: dossier.subject,
      summary: dossier.summary,
      createdAt: dossier.createdAt,
    };
  }

  async getDossier(id: string) {
    const dossier = await this.prisma.researchDossier.findUnique({
      where: { id },
    });
    if (!dossier) {
      throw new NotFoundException(`Research dossier "${id}" not found`);
    }
    return dossier;
  }

  async synthesize(dossierId: string, nameOverride?: string) {
    if (!dossierId?.trim()) {
      throw new BadRequestException('dossierId is required');
    }

    const dossier = await this.getDossier(dossierId);

    const persona = await this.synthesisService.synthesize(
      dossier.summary,
      dossier.subject,
      nameOverride,
    );

    // Extract name/tagline from v2 (nested) or v1 (flat)
    const name =
      'identity' in persona ? persona.identity.name : persona.name;
    const tagline =
      'identity' in persona ? persona.identity.tagline : persona.tagline;

    const created = await this.prisma.persona.create({
      data: {
        name,
        tagline,
        personaJson: persona as object,
        isTemplate: false,
      },
    });

    return created;
  }
}
