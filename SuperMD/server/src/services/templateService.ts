import { PrismaClient, Template } from '@prisma/client';

const prisma = new PrismaClient();

export const templateService = {
    /**
     * Get all templates, optionally filtered by category
     */
    async getTemplates(category?: string): Promise<Template[]> {
        if (category) {
            return prisma.template.findMany({
                where: { category },
                orderBy: { name: 'asc' },
            });
        }
        return prisma.template.findMany({
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
    },

    /**
     * Get a specific template by ID
     */
    async getTemplateById(id: string): Promise<Template | null> {
        return prisma.template.findUnique({
            where: { id },
        });
    },

    /**
     * Seed default system templates if they don't exist
     */
    async seedDefaultTemplates(): Promise<void> {
        const count = await prisma.template.count({ where: { isSystem: true } });
        if (count > 0) return;

        const defaults = [
            {
                name: 'Academic Paper',
                description: 'Standard structure for academic research papers',
                category: 'Academic',
                content: `# Title

## Abstract
[Write abstract here]

## 1. Introduction
[Introduction content]

## 2. Methodology
[Methodology content]

## 3. Results
[Results content]

## 4. Discussion
[Discussion content]

## 5. Conclusion
[Conclusion content]

## References
`,
                isSystem: true,
            },
            {
                name: 'Business Report',
                description: 'Professional business report format',
                category: 'Business',
                content: `# Executive Summary
[Summary of key findings]

## 1. Current Status
[Analysis of current situation]

## 2. Problem Statement
[Description of the problem]

## 3. Analysis
[Detailed analysis]

## 4. Recommendations
[Strategic recommendations]

## 5. Conclusion
[Final thoughts]
`,
                isSystem: true,
            },
            {
                name: 'Technical Specification',
                description: 'Software design document template',
                category: 'Technical',
                content: `# System Overview
[High-level description]

## 1. Architecture
[System architecture diagram and description]

## 2. API Specification
[API endpoints and data models]

## 3. Database Schema
[ERD and schema details]

## 4. Security Considerations
[Auth, encryption, and compliance]

## 5. Deployment
[CI/CD and infrastructure]
`,
                isSystem: true,
            },
        ];

        for (const t of defaults) {
            await prisma.template.create({ data: t });
        }
        console.log('[TemplateService] Seeded default templates');
    },
};
