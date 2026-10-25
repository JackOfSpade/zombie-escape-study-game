export const TOPIC_ASSESSMENT_INSTRUCTION: string;
export const TOPIC_ASSESSMENT_TEXT_LIMIT: number;
export interface TopicAssessmentValue {
  topicId: string;
  text: string;
}
export function topicAssessmentTopics(contract: unknown): string[];
export function validateTopicAssessments(
  value: unknown,
  topics: readonly string[],
  required?: boolean,
): TopicAssessmentValue[];
