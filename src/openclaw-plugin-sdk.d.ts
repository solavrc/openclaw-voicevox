declare module "openclaw/plugin-sdk/plugin-entry" {
  export type SpeechProviderConfig = Record<string, unknown>;
  export type SpeechProviderOverrides = Record<string, unknown>;

  export type SpeechDirectiveTokenParseContext = {
    key: string;
    value: string;
    policy: {
      allowVoice?: boolean;
      allowVoiceSettings?: boolean;
    };
    currentOverrides?: SpeechProviderOverrides;
  };

  export type SpeechDirectiveTokenParseResult = {
    handled: boolean;
    warnings?: string[];
    overrides?: SpeechProviderOverrides;
  };

  export type SpeechTalkOverridesContext = {
    params: SpeechProviderOverrides;
    cfg?: unknown;
  };

  export type SpeechTalkConfigContext = {
    baseTtsConfig: Record<string, unknown>;
    talkProviderConfig: Record<string, unknown>;
    cfg?: unknown;
    timeoutMs?: number;
  };

  export type SpeechSynthesisRequest = {
    text: string;
    cfg?: unknown;
    providerConfig?: SpeechProviderConfig;
    providerOverrides?: SpeechProviderOverrides;
    target?: "audio-file" | "voice-note";
    timeoutMs?: number;
  };

  export type SpeechTelephonySynthesisRequest = {
    text: string;
    cfg?: unknown;
    providerConfig?: SpeechProviderConfig;
    providerOverrides?: SpeechProviderOverrides;
    timeoutMs?: number;
  };

  export type SpeechVoiceOption = {
    id: string;
    name?: string;
    category?: string;
    description?: string;
  };

  export type SpeechProviderPlugin = {
    id: string;
    label: string;
    aliases?: string[];
    defaultTimeoutMs?: number;
    voices?: readonly string[];
    resolveConfig?: (ctx: {
      rawConfig: Record<string, unknown>;
      timeoutMs?: number;
      cfg?: unknown;
    }) => SpeechProviderConfig;
    resolveTalkConfig?: (ctx: SpeechTalkConfigContext) => SpeechProviderConfig;
    isConfigured: (ctx: {
      providerConfig?: SpeechProviderConfig;
      cfg?: unknown;
      timeoutMs?: number;
    }) => boolean;
    parseDirectiveToken?: (
      ctx: SpeechDirectiveTokenParseContext,
    ) => SpeechDirectiveTokenParseResult;
    resolveTalkOverrides?: (ctx: SpeechTalkOverridesContext) => SpeechProviderOverrides;
    synthesize: (req: SpeechSynthesisRequest) => Promise<{
      audioBuffer: Buffer;
      outputFormat: string;
      fileExtension: string;
      voiceCompatible: boolean;
    }>;
    synthesizeTelephony?: (req: SpeechTelephonySynthesisRequest) => Promise<{
      audioBuffer: Buffer;
      outputFormat: string;
      sampleRate: number;
    }>;
    listVoices?: () => Promise<SpeechVoiceOption[]>;
  };

  export type PluginApi = {
    pluginConfig?: unknown;
    registerSpeechProvider(provider: SpeechProviderPlugin): void;
  };

  export type PluginEntry = {
    id: string;
    name: string;
    description?: string;
    register(api: PluginApi): void;
  };

  export function definePluginEntry(entry: PluginEntry): PluginEntry;
}
