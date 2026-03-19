import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function QuestionStep({ question, answer, onChange }) {
  if (question.type === 'select' && question.options?.length) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{question.question}</Label>
        <Select value={answer || ''} onValueChange={onChange}>
          <SelectTrigger className="h-12 rounded-xl bg-card">
            <SelectValue placeholder="Sélectionnez..." />
          </SelectTrigger>
          <SelectContent>
            {question.options.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (question.type === 'number') {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{question.question}</Label>
        <Input
          type="number"
          value={answer || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Entrez un nombre..."
          className="h-12 rounded-xl bg-card"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{question.question}</Label>
      <Input
        value={answer || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Votre réponse..."
        className="h-12 rounded-xl bg-card"
      />
    </div>
  );
}