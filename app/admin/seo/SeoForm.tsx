'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type GlobalSeoData, updateGlobalSeo, updateLlmsTxt } from '@/actions/seo';

type Props = {
  initialData: GlobalSeoData;
  initialLlmsTxt: string;
};

function CharCount({ value, max, warn }: { value: string; max: number; warn: number }) {
  const len = value.length;
  const color = len <= max ? 'text-green-500' : len <= warn ? 'text-yellow-500' : 'text-red-500';
  return <span className={`text-xs ${color}`}>{len}/{max}</span>;
}

function SerpPreview({ title, description }: { title: string; description: string }) {
  return (
    <div className="border border-border rounded-md p-3 bg-white dark:bg-zinc-900 space-y-0.5">
      <div className="text-blue-600 dark:text-blue-400 text-lg leading-tight truncate">{title}</div>
      <div className="text-green-700 dark:text-green-400 text-sm">hommm.eu</div>
      <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{description}</div>
    </div>
  );
}

export function SeoForm({ initialData, initialLlmsTxt }: Props) {
  const [data, setData] = useState(initialData);
  const [llmsTxt, setLlmsTxt] = useState(initialLlmsTxt);
  const [savingSeo, setSavingSeo] = useState(false);
  const [savingLlms, setSavingLlms] = useState(false);

  const handleChange = (field: keyof GlobalSeoData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSeo = async () => {
    setSavingSeo(true);
    const res = await updateGlobalSeo(data);
    if (res.success) toast.success('Zapisano ustawienia SEO');
    else toast.error(res.error ?? 'Błąd zapisu');
    setSavingSeo(false);
  };

  const handleSaveLlms = async () => {
    setSavingLlms(true);
    const res = await updateLlmsTxt(llmsTxt);
    if (res.success) toast.success('Zapisano llms.txt');
    else toast.error(res.error ?? 'Błąd zapisu');
    setSavingLlms(false);
  };

  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">Ogólne SEO</TabsTrigger>
        <TabsTrigger value="ai">AI / LLM</TabsTrigger>
        <TabsTrigger value="llms">llms.txt</TabsTrigger>
      </TabsList>


      <TabsContent value="general" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Domyślne meta tagi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tytuł (PL)</Label>
                <Input
                  value={data.defaultTitlePl}
                  onChange={(e) => handleChange('defaultTitlePl', e.target.value)}
                />
                <CharCount value={data.defaultTitlePl} max={60} warn={70} />
              </div>
              <div className="space-y-2">
                <Label>Tytuł (EN)</Label>
                <Input
                  value={data.defaultTitleEn}
                  onChange={(e) => handleChange('defaultTitleEn', e.target.value)}
                />
                <CharCount value={data.defaultTitleEn} max={60} warn={70} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Opis (PL)</Label>
                <Textarea
                  rows={3}
                  value={data.defaultDescriptionPl}
                  onChange={(e) => handleChange('defaultDescriptionPl', e.target.value)}
                />
                <CharCount value={data.defaultDescriptionPl} max={160} warn={180} />
              </div>
              <div className="space-y-2">
                <Label>Opis (EN)</Label>
                <Textarea
                  rows={3}
                  value={data.defaultDescriptionEn}
                  onChange={(e) => handleChange('defaultDescriptionEn', e.target.value)}
                />
                <CharCount value={data.defaultDescriptionEn} max={160} warn={180} />
              </div>
            </div>

            {/* Podgląd SERP */}
            <div className="space-y-3">
              <Label className="text-muted-foreground">Podgląd Google (PL)</Label>
              <SerpPreview
                title={data.defaultTitlePl || 'HOMMM — Domek w naturze'}
                description={data.defaultDescriptionPl || 'Opis strony...'}
              />
              <Label className="text-muted-foreground">Podgląd Google (EN)</Label>
              <SerpPreview
                title={data.defaultTitleEn || 'HOMMM — House in nature'}
                description={data.defaultDescriptionEn || 'Page description...'}
              />
            </div>
            <div className="space-y-2">
              <Label>OG Image URL</Label>
              <Input
                value={data.ogImageUrl}
                onChange={(e) => handleChange('ogImageUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Custom head tags (HTML)</Label>
              <Textarea
                rows={4}
                value={data.customHeadTags}
                onChange={(e) => handleChange('customHeadTags', e.target.value)}
                placeholder='<meta name="..." content="...">'
                className="font-mono text-xs"
              />
            </div>
            <Button onClick={handleSaveSeo} disabled={savingSeo}>
              {savingSeo ? 'Zapisywanie...' : 'Zapisz SEO'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ai" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reguły robots.txt dla crawlerów AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Poniższe reguły zostaną dołączone do robots.txt. Kontroluj, które boty AI mogą indeksować stronę.
            </p>
            <Textarea
              rows={12}
              value={data.aiRobotsRules}
              onChange={(e) => handleChange('aiRobotsRules', e.target.value)}
              className="font-mono text-xs"
            />
            <Button onClick={handleSaveSeo} disabled={savingSeo}>
              {savingSeo ? 'Zapisywanie...' : 'Zapisz reguły AI'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="llms" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">llms.txt — opis obiektu dla LLM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Plik dostępny pod <code>/llms.txt</code>. Opisz obiekt w sposób czytelny dla modeli AI:
              nazwa, lokalizacja, oferta, cennik, kontakt, USP.
            </p>
            <Textarea
              rows={20}
              value={llmsTxt}
              onChange={(e) => setLlmsTxt(e.target.value)}
              className="font-mono text-xs"
              placeholder={`# HOMMM — Domek na wyłączność\n\n## Lokalizacja\n...\n\n## Oferta\n...\n\n## Cennik\n...\n\n## Kontakt\n...`}
            />
            <Button onClick={handleSaveLlms} disabled={savingLlms}>
              {savingLlms ? 'Zapisywanie...' : 'Zapisz llms.txt'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
