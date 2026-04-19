import { type CSSProperties, useMemo, useState } from "react";
import { toast } from "sonner";
import { buildCircuitAssetUrl, RACE_HERO_PREVIEW_OPTIONS, resolveRaceHeroTheme } from "@/lib/raceHeroThemes";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT_PREVIEW_RACE =
  RACE_HERO_PREVIEW_OPTIONS.find((option) => option.key === "miami") ??
  RACE_HERO_PREVIEW_OPTIONS[0];

type OverlayDraft = {
  width: number;
  opacity: number;
  offsetX: number;
  offsetY: number;
  scale: number;
};

type FileSystemFileHandleLike = {
  getFile: () => Promise<File>;
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
  name?: string;
};

type WindowWithFilePicker = Window &
  typeof globalThis & {
    showOpenFilePicker?: (options?: {
      multiple?: boolean;
      excludeAcceptAllOption?: boolean;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandleLike[]>;
  };

function parsePercent(value: string): number {
  return Number.parseFloat(value.replace("%", "")) || 0;
}

function buildDraft(theme: ReturnType<typeof resolveRaceHeroTheme>): OverlayDraft {
  return {
    width: parsePercent(theme.overlayWidth),
    opacity: Number(theme.overlayOpacity),
    offsetX: parsePercent(theme.overlayOffsetX),
    offsetY: parsePercent(theme.overlayOffsetY),
    scale: Number(theme.overlayScale ?? 1),
  };
}

function formatThemeSnippet(draft: OverlayDraft): string {
  return [
    `overlayWidth: "${draft.width}%",`,
    `overlayOpacity: ${draft.opacity.toFixed(2)},`,
    `overlayOffsetX: "${draft.offsetX}%",`,
    `overlayOffsetY: "${draft.offsetY}%",`,
    `overlayScale: ${draft.scale.toFixed(2)},`,
  ].join("\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patchThemeBlock(source: string, themeKey: string, draft: OverlayDraft): string {
  const blockPattern = new RegExp(
    `(\\{\\s*\\n\\s*key: "${escapeRegExp(themeKey)}",[\\s\\S]*?\\n\\s*svgStyle: "white-outline",)([\\s\\S]*?\\n\\s*\\},)`,
    "m",
  );

  const match = source.match(blockPattern);
  if (!match) {
    throw new Error(`Could not find theme block for "${themeKey}" in raceHeroThemes.ts`);
  }

  const replacementLines = [
    `${match[1]}`,
    `    overlayWidth: "${draft.width}%",`,
    `    overlayOpacity: ${draft.opacity.toFixed(2)},`,
    `    overlayOffsetX: "${draft.offsetX}%",`,
    `    overlayOffsetY: "${draft.offsetY}%",`,
    `    overlayScale: ${draft.scale.toFixed(2)},`,
    `  },`,
  ].join("\n");

  return source.replace(blockPattern, replacementLines);
}

export function AdminHeroPreviewPage() {
  const [selectedRaceKey, setSelectedRaceKey] = useState(DEFAULT_PREVIEW_RACE.key);
  const [overrides, setOverrides] = useState<Record<string, OverlayDraft>>({});
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandleLike | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const selectedRace =
    RACE_HERO_PREVIEW_OPTIONS.find((option) => option.key === selectedRaceKey) ??
    DEFAULT_PREVIEW_RACE;

  const heroTheme = useMemo(
    () => resolveRaceHeroTheme(selectedRace.raceName),
    [selectedRace.raceName],
  );
  const circuitAssetUrl = useMemo(() => buildCircuitAssetUrl(heroTheme), [heroTheme]);
  const overlayDraft = overrides[selectedRace.key] ?? buildDraft(heroTheme);

  function updateDraft<K extends keyof OverlayDraft>(key: K, value: OverlayDraft[K]) {
    setOverrides((current) => ({
      ...current,
      [selectedRace.key]: {
        ...(current[selectedRace.key] ?? buildDraft(heroTheme)),
        [key]: value,
      },
    }));
  }

  function resetCurrentRace() {
    setOverrides((current) => {
      const next = { ...current };
      delete next[selectedRace.key];
      return next;
    });
  }

  async function chooseThemeFile(): Promise<FileSystemFileHandleLike | null> {
    const picker = (window as WindowWithFilePicker).showOpenFilePicker;
    if (!picker) {
      toast.error("This browser does not support local file editing.");
      return null;
    }

    const [handle] = await picker({
      multiple: false,
      excludeAcceptAllOption: false,
      types: [
        {
          description: "TypeScript files",
          accept: {
            "text/typescript": [".ts"],
          },
        },
      ],
    });

    if (!handle) return null;
    setFileHandle(handle);
    return handle;
  }

  async function applyToThemeFile() {
    setIsApplying(true);
    try {
      const handle = fileHandle ?? (await chooseThemeFile());
      if (!handle) {
        setIsApplying(false);
        return;
      }

      const file = await handle.getFile();
      if (!file.name?.endsWith("raceHeroThemes.ts")) {
        toast.error("Select src/lib/raceHeroThemes.ts to apply the preview values.");
        setIsApplying(false);
        return;
      }

      const source = await file.text();
      const nextSource = patchThemeBlock(source, heroTheme.key, overlayDraft);
      const writable = await handle.createWritable();
      await writable.write(nextSource);
      await writable.close();

      toast.success(`Applied ${selectedRace.raceName} overlay values to raceHeroThemes.ts`, {
        description: "Local-only browser file access. This does not affect deployed builds until you commit the file.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to apply preview values to the theme file.";
      toast.error(message);
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <p className="ff-kicker">Hero Preview</p>
          <h2 className="ff-display text-4xl text-white md:text-5xl">Race Hero Lab</h2>
          <p className="max-w-3xl text-sm leading-6 text-on-surface-variant md:text-base">
            Select a race and inspect the exact Home hero treatment, including the race palette and centered circuit overlay.
          </p>
        </div>

        <div className="w-full max-w-md space-y-2">
          <label htmlFor="adminHeroRace" className="ff-kicker">
            Preview race
          </label>
          <Select value={selectedRaceKey} onValueChange={setSelectedRaceKey}>
            <SelectTrigger id="adminHeroRace" className="bg-surface-container-lowest text-on-surface">
              <SelectValue placeholder="Select race" />
            </SelectTrigger>
            <SelectContent>
              {RACE_HERO_PREVIEW_OPTIONS.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-inverse-surface">
        <CardContent className="space-y-5 px-6 py-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="border border-white/8 bg-white/3 px-4 py-4">
                <p className="ff-kicker">Theme key</p>
                <p className="mt-2 text-lg font-semibold uppercase tracking-[0.06em] text-white">
                  {heroTheme.key}
                </p>
              </div>
              <div className="border border-white/8 bg-white/3 px-4 py-4">
                <p className="ff-kicker">Circuit layout</p>
                <p className="mt-2 text-lg font-semibold uppercase tracking-[0.06em] text-white">
                  {heroTheme.layoutId}
                </p>
              </div>
              <div className="border border-white/8 bg-white/3 px-4 py-4">
                <p className="ff-kicker">SVG style</p>
                <p className="mt-2 text-lg font-semibold uppercase tracking-[0.06em] text-white">
                  {heroTheme.svgStyle}
                </p>
              </div>
            </div>

            <div className="border border-white/8 bg-black/20 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="ff-kicker">Theme patch</p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Live values for this race. Apply them directly to the local theme file or copy them into the map manually.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={resetCurrentRace}>
                    Reset race
                  </Button>
                  <Button size="sm" onClick={applyToThemeFile} disabled={isApplying}>
                    {isApplying ? "Applying…" : "Apply to file"}
                  </Button>
                </div>
              </div>
              <pre className="mt-4 max-w-none border-white/8 bg-white/3 text-inverse-on-surface">
{formatThemeSnippet(overlayDraft)}
              </pre>
              <p className="mt-3 text-xs leading-5 text-on-surface-variant">
                Local only: this uses browser file-system access and only works against your local
                checkout of <span className="font-semibold text-white">src/lib/raceHeroThemes.ts</span>.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SliderField
              label="Overlay width"
              value={overlayDraft.width}
              min={60}
              max={120}
              step={1}
              unit="%"
              onChange={(value) => updateDraft("width", value)}
            />
            <SliderField
              label="Overlay opacity"
              value={overlayDraft.opacity}
              min={0.05}
              max={0.3}
              step={0.01}
              unit=""
              onChange={(value) => updateDraft("opacity", Number(value.toFixed(2)))}
            />
            <SliderField
              label="Zoom"
              value={overlayDraft.scale}
              min={0.6}
              max={2}
              step={0.05}
              unit="x"
              onChange={(value) => updateDraft("scale", Number(value.toFixed(2)))}
            />
            <SliderField
              label="Offset X"
              value={overlayDraft.offsetX}
              min={-20}
              max={20}
              step={1}
              unit="%"
              onChange={(value) => updateDraft("offsetX", value)}
            />
            <SliderField
              label="Offset Y"
              value={overlayDraft.offsetY}
              min={-20}
              max={20}
              step={1}
              unit="%"
              onChange={(value) => updateDraft("offsetY", value)}
            />
          </div>
          <p className="text-sm text-on-surface-variant">
            This preview reuses the live race-theme variables and the same circuit asset source as the signed-in Home hero. The controls here only affect the admin preview until you copy the values into the theme file.
          </p>
        </CardContent>
      </Card>

      <section
        className="ff-hero-band overflow-hidden border border-white/8"
        style={
          {
            "--ff-hero-primary": heroTheme.primary,
            "--ff-hero-secondary": heroTheme.secondary,
            "--ff-hero-glow": heroTheme.glow,
            "--ff-hero-accent-soft": heroTheme.accentSoft,
            "--ff-hero-circuit-width": `${overlayDraft.width}%`,
            "--ff-hero-circuit-opacity": `${overlayDraft.opacity}`,
            "--ff-hero-circuit-offset-x": `${overlayDraft.offsetX}%`,
            "--ff-hero-circuit-offset-y": `${overlayDraft.offsetY}%`,
            "--ff-hero-circuit-scale": `${overlayDraft.scale}`,
          } as CSSProperties
        }
      >
        {circuitAssetUrl ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <img
              src={circuitAssetUrl}
              alt=""
              aria-hidden="true"
              className="ff-hero-circuit absolute left-1/2 top-1/2 opacity-0 md:opacity-100"
            />
          </div>
        ) : null}

        <div className="relative z-10 flex min-h-[360px] flex-col items-center justify-center px-4 py-8 text-center">
          <Badge variant="secondary" className="border-white/12 bg-white/8 text-white">
            Round {selectedRace.round}
          </Badge>
          <h1 className="ff-display mt-8 max-w-4xl text-6xl text-white md:text-8xl">
            {selectedRace.raceName}
          </h1>
          <p className="mt-8 max-w-2xl text-lg font-semibold uppercase tracking-[0.12em] text-white/90 md:text-2xl">
            Next round opens soon
          </p>
        </div>
      </section>
    </div>
  );
}

function SliderField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="border border-white/8 bg-white/3 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="ff-kicker">{props.label}</p>
        <span className="text-sm font-semibold text-white">
          {props.value}
          {props.unit}
        </span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
        className="mt-4 h-2 w-full cursor-pointer appearance-none bg-transparent accent-primary"
      />
      <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-on-surface-variant">
        <span>
          {props.min}
          {props.unit}
        </span>
        <span>
          {props.max}
          {props.unit}
        </span>
      </div>
    </div>
  );
}
