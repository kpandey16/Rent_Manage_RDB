"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import { transliterateToHindi, isValidHindiName } from '@/utils/transliterate';
import { useTranslations } from '@/hooks/use-translations';

interface DualNameInputProps {
  name: string;
  nameHi?: string;
  onNameChange: (name: string) => void;
  onNameHiChange: (nameHi: string) => void;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Input component for both English and Hindi names
 * Includes auto-transliteration helper
 */
export function DualNameInput({
  name,
  nameHi = '',
  onNameChange,
  onNameHiChange,
  disabled = false,
  required = false,
}: DualNameInputProps) {
  const { t } = useTranslations();
  const [showHindiField, setShowHindiField] = useState(!!nameHi);

  const handleAutoTransliterate = () => {
    if (name) {
      const transliterated = transliterateToHindi(name);
      onNameHiChange(transliterated);
      setShowHindiField(true);
    }
  };

  return (
    <div className="space-y-3">
      {/* English Name */}
      <div className="grid gap-2">
        <Label htmlFor="name">
          {t("tenant.name")} (English) {required && '*'}
        </Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g., Ramesh Kumar"
          disabled={disabled}
          required={required}
        />
      </div>

      {/* Hindi Name (Optional) */}
      {!showHindiField ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowHindiField(true)}
          disabled={disabled}
          className="w-full"
        >
          <Languages className="h-4 w-4 mr-2" />
          Add Hindi Name (Optional)
        </Button>
      ) : (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="nameHi">
              {t("tenant.name")} (हिंदी) <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAutoTransliterate}
              disabled={disabled || !name}
              className="h-auto py-1 px-2 text-xs"
            >
              <Languages className="h-3 w-3 mr-1" />
              Auto-fill
            </Button>
          </div>
          <Input
            id="nameHi"
            type="text"
            value={nameHi}
            onChange={(e) => onNameHiChange(e.target.value)}
            placeholder="e.g., रमेश कुमार"
            disabled={disabled}
            dir="auto"
            lang="hi"
          />
          {nameHi && !isValidHindiName(nameHi) && (
            <p className="text-xs text-orange-600">
              ⚠️ Tip: Enter name in Devanagari (Hindi) script
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            This name will be displayed when language is set to Hindi
          </p>
        </div>
      )}
    </div>
  );
}
