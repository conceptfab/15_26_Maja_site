'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  type EmailTemplatesMap,
  type TemplateKey,
  TEMPLATE_LABELS,
  TEMPLATE_VARS,
  SAMPLE_VARS,
  getDefaultTemplate,
  interpolate,
} from '@/lib/email-template-defaults';
import { updateEmailTemplate, updateMailingLogoUrl, sendTestEmail } from '@/actions/mailing';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { getGalleryThumbs } from '@/actions/gallery';

import { emailLayout } from '@/lib/email-layout';

type Props = {
  initialTemplates: EmailTemplatesMap;
  initialLogoUrl: string;
};

type GalleryThumb = { id: string; webpUrl: string; thumbUrl: string | null; altPl: string | null };

export function MailingEditor({ initialTemplates, initialLogoUrl }: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [saving, setSaving] = useState<TemplateKey | null>(null);
  const [sendingTest, setSendingTest] = useState<TemplateKey | null>(null);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [logoSaving, setLogoSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerThumbs, setPickerThumbs] = useState<GalleryThumb[]>([]);
  const [pickerTargetKey, setPickerTargetKey] = useState<TemplateKey | 'logo' | null>(null);
  const textareaRefs = useRef<Partial<Record<TemplateKey, HTMLTextAreaElement | null>>>({});

  const openLogoPicker = async () => {
    setPickerTargetKey('logo');
    const thumbs = await getGalleryThumbs();
    setPickerThumbs(thumbs);
    setPickerOpen(true);
  };

  const handleSaveLogo = async (url: string) => {
    setLogoSaving(true);
    await updateMailingLogoUrl(url);
    setLogoSaving(false);
  };

  const handleChange = (key: TemplateKey, field: 'subject' | 'body', value: string) => {
    setTemplates((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleSave = async (key: TemplateKey) => {
    setSaving(key);
    const res = await updateEmailTemplate(key, templates[key]);
    if ('error' in res) toast.error(res.error ?? 'Błąd zapisu');
    else toast.success('Szablon zapisany');
    setSaving(null);
  };

  const handleReset = (key: TemplateKey) => {
    setTemplates((prev) => ({ ...prev, [key]: getDefaultTemplate(key) }));
  };

  const openImagePicker = async (key: TemplateKey) => {
    setPickerTargetKey(key);
    const thumbs = await getGalleryThumbs();
    setPickerThumbs(thumbs);
    setPickerOpen(true);
  };

  const handlePickImage = (img: GalleryThumb) => {
    if (!pickerTargetKey) return;
    if (pickerTargetKey === 'logo') {
      setLogoUrl(img.webpUrl);
      handleSaveLogo(img.webpUrl);
      setPickerOpen(false);
      return;
    }
    const url = img.webpUrl;
    const tag = `<img src="${url}" alt="${img.altPl ?? ''}" style="max-width:100%;height:auto;display:block;margin:8px 0">`;
    const textarea = textareaRefs.current[pickerTargetKey];
    if (textarea) {
      const start = textarea.selectionStart ?? textarea.value.length;
      const end = textarea.selectionEnd ?? textarea.value.length;
      const newBody = textarea.value.slice(0, start) + tag + textarea.value.slice(end);
      setTemplates((prev) => ({ ...prev, [pickerTargetKey]: { ...prev[pickerTargetKey], body: newBody } }));
    } else {
      setTemplates((prev) => ({
        ...prev,
        [pickerTargetKey]: { ...prev[pickerTargetKey], body: prev[pickerTargetKey].body + '\n' + tag },
      }));
    }
    setPickerOpen(false);
  };

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-1.5">Logo w mailach <InfoTooltip text="Logo na górze emaili do gości. PNG/WebP, do 200px szerokości." /></CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="w-20 h-20 rounded border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
            : <span className="text-xs text-muted-foreground text-center px-1">brak</span>
          }
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" size="sm" variant="outline" onClick={openLogoPicker} disabled={logoSaving}>
            {logoSaving ? 'Zapisywanie…' : 'Zmień z galerii'}
          </Button>
          {logoUrl && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive text-xs"
              onClick={() => { setLogoUrl(''); handleSaveLogo(''); }}
              disabled={logoSaving}
            >
              Usuń logo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>

    <Tabs defaultValue="guestConfirmation">
      <TabsList className="flex-wrap h-auto gap-1 mb-2">
        {(Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map((key) => (
          <TabsTrigger key={key} value={key} className="text-xs">
            {TEMPLATE_LABELS[key]}
          </TabsTrigger>
        ))}
      </TabsList>

      {(Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map((key) => {
        const previewBody = interpolate(templates[key].body, SAMPLE_VARS);
        const previewSubject = interpolate(templates[key].subject, SAMPLE_VARS);
        const previewHtml = emailLayout(previewBody, logoUrl);

        return (
          <TabsContent key={key} value={key} className="mt-0">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Edytor */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Edycja szablonu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Temat</Label>
                    <Input
                      value={templates[key].subject}
                      onChange={(e) => handleChange(key, 'subject', e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5">Treść (HTML) <InfoTooltip text="HTML body emaila. Użyj zmiennych {{guestName}}, {{totalPrice}} itp. do dynamicznych danych." /></Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs h-6 px-2"
                        onClick={() => openImagePicker(key)}
                      >
                        Wstaw obraz
                      </Button>
                    </div>
                    <Textarea
                      ref={(el) => { textareaRefs.current[key] = el; }}
                      rows={16}
                      value={templates[key].body}
                      onChange={(e) => handleChange(key, 'body', e.target.value)}
                      className="font-mono text-xs resize-y"
                    />
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium">Dostępne zmienne:</p>
                    <div className="flex flex-wrap gap-1">
                      {TEMPLATE_VARS.map((v) => (
                        <code key={v} className="bg-muted px-1.5 py-0.5 rounded">{v}</code>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => handleSave(key)}
                      disabled={saving === key}
                    >
                      {saving === key ? 'Zapisywanie…' : 'Zapisz'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReset(key)}
                      disabled={saving === key}
                    >
                      Przywróć domyślny
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sendingTest === key}
                      onClick={async () => {
                        setSendingTest(key);
                        const result = await sendTestEmail(key);
                        if ('error' in result) {
                          toast.error(result.error);
                        } else {
                          toast.success(`Testowy email wysłany na ${result.sentTo}`);
                        }
                        setSendingTest(null);
                      }}
                    >
                      {sendingTest === key ? 'Wysyłanie…' : 'Wyślij testowy'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Podgląd */}
              <Card className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-baseline gap-2 flex-wrap">
                    Podgląd
                    <span className="text-sm font-normal text-muted-foreground truncate max-w-xs">
                      Temat: {previewSubject}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full min-h-[460px] rounded-b-lg border-0"
                    title={`Podgląd: ${TEMPLATE_LABELS[key]}`}
                    sandbox="allow-same-origin"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        );
      })}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Wybierz obraz z galerii</DialogTitle>
          </DialogHeader>
          {pickerThumbs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Brak zdjęć w galerii</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto">
              {pickerThumbs.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  className="relative aspect-square rounded overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                  onClick={() => handlePickImage(img)}
                  title={img.altPl ?? ''}
                >
                  <Image
                    src={img.thumbUrl || img.webpUrl}
                    alt={img.altPl ?? ''}
                    fill
                    className="object-cover"
                    sizes="100px"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
    </div>
  );
}
