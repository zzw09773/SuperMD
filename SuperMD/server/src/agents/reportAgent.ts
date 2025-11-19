import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LLMFactory, LLMConfig } from '../lib/llmFactory';

/**
 * Simple Report Generator using LLM
 * This is a simplified version that works without complex StateGraph setup
 */

interface ReportSection {
    header: string;
    content: string;
}

/**
 * Generate a report outline from a template and topic
 */
async function generateOutline(topic: string, template: string, llmConfig: LLMConfig): Promise<string[]> {
    const llm = LLMFactory.createModel(llmConfig);

    const prompt = `You are an expert report planner.
Topic: "${topic}"
Template Structure:
${template}

Generate a detailed outline for this report based on the template.
Return ONLY a JSON array of strings, where each string is a section header.
Example: ["Introduction", "Background Analysis", "Key Findings", "Recommendations", "Conclusion"]

Output (JSON array only):`;

    const response = await llm.invoke([new SystemMessage(prompt)]);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    try {
        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const outline = JSON.parse(jsonStr);
        return Array.isArray(outline) ? outline : ['Introduction', 'Main Body', 'Conclusion'];
    } catch (e) {
        console.error('[ReportAgent] Failed to parse outline:', content);
        return ['Introduction', 'Main Body', 'Conclusion'];
    }
}

/**
 * Write content for a specific section
 */
async function writeSection(
    topic: string,
    sectionHeader: string,
    llmConfig: LLMConfig
): Promise<string> {
    const llm = LLMFactory.createModel(llmConfig);

    const prompt = `You are an expert report writer.

Topic: "${topic}"
Current Section: "${sectionHeader}"

Write comprehensive, professional content for this section. 
Use markdown formatting (headers, lists, bold, etc.) where appropriate.
Be detailed and thorough.
Do not include the section header itself in your output - just the content.

Content:`;

    const response = await llm.invoke([new SystemMessage(prompt)]);
    return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
}

/**
 * Generate a full report
 */
export const generateReport = async (
    topic: string,
    template: string,
    llmConfig: LLMConfig,
    onProgress?: (msg: string) => void
): Promise<string> => {
    try {
        // Step 1: Generate outline
        onProgress?.(`📋 Planning report structure...`);
        const outline = await generateOutline(topic, template, llmConfig);
        onProgress?.(`✅ Created outline with ${outline.length} sections`);

        // Step 2: Write each section
        const sections: ReportSection[] = [];

        for (let i = 0; i < outline.length; i++) {
            const header = outline[i];
            onProgress?.(`✍️ Writing section ${i + 1}/${outline.length}: ${header}`);

            const content = await writeSection(topic, header, llmConfig);
            sections.push({ header, content });

            onProgress?.(`✅ Completed section ${i + 1}/${outline.length}`);
        }

        // Step 3: Assemble final report
        onProgress?.(`📝 Assembling final report...`);

        let fullReport = `# ${topic}\n\n`;

        for (const section of sections) {
            fullReport += `## ${section.header}\n\n${section.content}\n\n`;
        }

        onProgress?.(`✅ Report generation complete!`);

        return fullReport;
    } catch (error) {
        console.error('[ReportAgent] Error generating report:', error);
        throw error;
    }
};
