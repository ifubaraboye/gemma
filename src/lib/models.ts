

export interface Model {
  id: string;
  name: string;
  supportTools: boolean;
}

export const AVAILABLE_MODELS: Model[] = [
  // { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", supportTools: true },
  // { id: "allenai/olmo-3.1-32b-think:free", name:"Olmo 3.1B Thinking", supportTools: false },
  { id: "mistralai/devstral-2512:free", name:"Mistral: Devstral", supportTools: true },
  { id: "tencent/hy3-preview:free", name:"Tencent HY3", supportTools: true },
  { id: "openai/gpt-oss-120b:free", name:"GPT-OSS 120B", supportTools: false },
  // { id: "qwen/qwen3-4b:free", name:"Qwen 3 4B", supportTools: true },
  // { id: "google/gemini-3-pro-preview", name:"Gemini 3 Pro", supportTools: true },
  // { id: "google/gemini-3-flash-preview", name:"Gemini 3 Flash", supportTools: true },
  // { id: "moonshotai/kimi-k2:free", name:"Kimi K2(0711)", supportTools: true },
];