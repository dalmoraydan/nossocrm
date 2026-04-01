'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock, Plus, Trash2 } from 'lucide-react';

const weekdays = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
];

const slotOptions = [
  { value: '30', label: '30 minutos' },
  { value: '60', label: '1 hora' },
  { value: '90', label: '1h30' },
  { value: '120', label: '2 horas' },
];

const intervalOptions = [
  { value: '0', label: '0 min' },
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
];

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

type AgendaConfig = {
  days: Record<DayKey, boolean>;
  hours: Record<DayKey, { start: string; end: string }>;
  slotDurationMinutes: number;
  intervalMinutes: number;
  blockedDates: string[];
  blockedTimes: Array<{ date: string; from: string; to: string }>;
};

const defaultState: AgendaConfig = {
  days: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
  },
  hours: {
    monday: { start: '09:00', end: '18:00' },
    tuesday: { start: '09:00', end: '18:00' },
    wednesday: { start: '09:00', end: '18:00' },
    thursday: { start: '09:00', end: '18:00' },
    friday: { start: '09:00', end: '18:00' },
    saturday: { start: '09:00', end: '13:00' },
  },
  slotDurationMinutes: 60,
  intervalMinutes: 0,
  blockedDates: [],
  blockedTimes: [],
};

export default function AgendaConfigPage() {
  const [config, setConfig] = useState<AgendaConfig>(defaultState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [newBlockedTime, setNewBlockedTime] = useState({ date: '', from: '', to: '' });

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/agenda');
      if (!res.ok) throw new Error('Falha ao obter configurações');
      const body = await res.json();
      if (body?.data) {
        setConfig({ ...defaultState, ...body.data });
      }
    } catch (e: any) {
      setError(e.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const saveConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/settings/agenda', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Falha ao salvar configurações');
      }

      window.alert('Configurações salvas com sucesso');
    } catch (e: any) {
      setError(e.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const addBlockedDate = () => {
    if (!newBlockedDate) return;
    if (config.blockedDates.includes(newBlockedDate)) return;
    setConfig({ ...config, blockedDates: [...config.blockedDates, newBlockedDate] });
    setNewBlockedDate('');
  };

  const addBlockedTime = () => {
    if (!newBlockedTime.date || !newBlockedTime.from || !newBlockedTime.to) return;
    setConfig({
      ...config,
      blockedTimes: [...config.blockedTimes, { ...newBlockedTime }],
    });
    setNewBlockedTime({ date: '', from: '', to: '' });
  };

  const removeBlockedDate = (date: string) => {
    setConfig({ ...config, blockedDates: config.blockedDates.filter(d => d !== date) });
  };

  const removeBlockedTime = (index: number) => {
    setConfig({
      ...config,
      blockedTimes: config.blockedTimes.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
          <CalendarDays className="h-5 w-5" /> Configurações de Agenda
        </div>

        {error && <div className="p-3 rounded-md bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200">{error}</div>}

        <div>
          <h3 className="font-semibold">Dias de Atendimento</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {weekdays.map((day) => (
              <label key={day.key} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.days[day.key as keyof AgendaConfig['days']]}
                  onChange={(e) => setConfig({
                    ...config,
                    days: {
                      ...config.days,
                      [day.key]: e.target.checked,
                    },
                  })}
                />
                {day.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold">Horários por Dia</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {weekdays.map((day) => (
              <div key={day.key} className="p-3 rounded-lg border border-slate-200 dark:border-white/10">
                <div className="font-medium">{day.label}</div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="time"
                    className="flex-1 rounded-md border border-slate-200 dark:border-white/10 p-2"
                    value={config.hours[day.key as keyof AgendaConfig['hours']].start}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        hours: {
                          ...config.hours,
                          [day.key]: {
                            ...config.hours[day.key as keyof AgendaConfig['hours']],
                            start: e.target.value,
                          },
                        },
                      })
                    }
                  />
                  <input
                    type="time"
                    className="flex-1 rounded-md border border-slate-200 dark:border-white/10 p-2"
                    value={config.hours[day.key as keyof AgendaConfig['hours']].end}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        hours: {
                          ...config.hours,
                          [day.key]: {
                            ...config.hours[day.key as keyof AgendaConfig['hours']],
                            end: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Duração padrão do slot</label>
            <select
              className="w-full rounded-md border border-slate-200 dark:border-white/10 p-2"
              value={String(config.slotDurationMinutes)}
              onChange={(e) => setConfig({ ...config, slotDurationMinutes: Number(e.target.value) })}
            >
              {slotOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Intervalo entre atendimentos</label>
            <select
              className="w-full rounded-md border border-slate-200 dark:border-white/10 p-2"
              value={String(config.intervalMinutes)}
              onChange={(e) => setConfig({ ...config, intervalMinutes: Number(e.target.value) })}
            >
              {intervalOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Bloqueio de datas específicas</h3>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={newBlockedDate}
              onChange={(e) => setNewBlockedDate(e.target.value)}
              className="rounded-md border border-slate-200 dark:border-white/10 p-2"
            />
            <button
              type="button"
              onClick={addBlockedDate}
              className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-3 py-2 text-white"
            >
              <Plus size={16} /> Adicionar
            </button>
          </div>
          <ul className="space-y-1">
            {config.blockedDates.map((date) => (
              <li key={date} className="flex items-center justify-between rounded-md border border-slate-200 dark:border-white/10 px-3 py-2">
                <span>{date}</span>
                <button type="button" onClick={() => removeBlockedDate(date)} className="text-red-600"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Bloqueio de horários específicos</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              type="date"
              value={newBlockedTime.date}
              onChange={(e) => setNewBlockedTime({ ...newBlockedTime, date: e.target.value })}
              className="rounded-md border border-slate-200 dark:border-white/10 p-2"
            />
            <input
              type="time"
              value={newBlockedTime.from}
              onChange={(e) => setNewBlockedTime({ ...newBlockedTime, from: e.target.value })}
              className="rounded-md border border-slate-200 dark:border-white/10 p-2"
            />
            <input
              type="time"
              value={newBlockedTime.to}
              onChange={(e) => setNewBlockedTime({ ...newBlockedTime, to: e.target.value })}
              className="rounded-md border border-slate-200 dark:border-white/10 p-2"
            />
            <button
              type="button"
              onClick={addBlockedTime}
              className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-3 py-2 text-white"
            >
              <Plus size={16} /> Adicionar
            </button>
          </div>
          <ul className="space-y-1">
            {config.blockedTimes.map((slot, index) => (
              <li key={`${slot.date}-${slot.from}-${index}`} className="flex items-center justify-between rounded-md border border-slate-200 dark:border-white/10 px-3 py-2">
                <span>{`${slot.date} ${slot.from} → ${slot.to}`}</span>
                <button type="button" onClick={() => removeBlockedTime(index)} className="text-red-600"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={saveConfig}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-white"
        >
          <Check size={16} /> Salvar Arquivo
        </button>

        {loading && <div className="text-sm text-slate-500">Carregando...</div>}
      </div>
    </div>
  );
}
