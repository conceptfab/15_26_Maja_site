'use client';

import { useState } from 'react';
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

export function SeoForm({ initialData, initialLlmsTxt }: Props) {
  const [data, setData] = useState(initialData);
  const [llmsTxt, setLlmsTxt] = useState(initialLlmsTxt);
  const [savingSeo, setSavingSeo] = useState(false);
  const [savingLlms, setSavingLlms] = useState(false);
  const [msg, setMsg] = useState('');

  const handleChange = (field: keyof GlobalSeoData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSeo = async () => {
    setSavingSeo(true);
    setMsg('');
    const res = await updateGlobalSeo(data);
    setMsg(res.success ? 'Zapisano ustawienia SEO' : res.error ?? 'Błąd');
    setSavingSeo(false);
  };

  const handleSaveLlms = async () => {
    setSavingLlms(true);
    setMsg('');
    const res = await updateLlmsTxt(llmsTxt);
    setMsg(res.success ? 'Zapisano llms.txt' : res.error ?? 'Błąd');
    setSavingLlms(false);
  };

  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">Ogólne SEO</TabsTrigger>
        <TabsTrigger value="ai">AI / LLM</TabsTrigger>
        <TabsTrigger value="llms">llms.txt</TabsTrigger>
      </TabsList>

      {msg && (
        <p className={`text-sm mt-2 ${msg.startsWith('Zapisano') ? 'text-green-500' : 'text-red-500'}`}>
          {msg}
        </p>
      )}

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
              </div>
              <div className="space-y-2">
                <Label>Tytuł (EN)</Label>
                <Input
                  value={data.defaultTitleEn}
                  onChange={(e) => handleChange('defaultTitleEn', e.target.value)}
                />
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
              </div>
              <div className="space-y-2">
                <Label>Opis (EN)</Label>
                <Textarea
                  rows={3}
                  value={data.defaultDescriptionEn}
                  onChange={(e) => handleChange('defaultDescriptionEn', e.target.value)}
                />
              </div>
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
