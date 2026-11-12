export function readyAIConfigured(): boolean {
  return !!process.env.DEEPSEEK_API_KEY?.trim();
}
