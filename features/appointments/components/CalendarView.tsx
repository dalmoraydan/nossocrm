'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar, Clock, Settings } from 'lucide-react';
import { appointmentService } from '@/lib/supabase/appointments';
import type { Appointment } from '@/types';

const statusColors = {
  'Disponível': 'bg-green-100 text-green-800 border-green-200',
  'Reservado': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Confirmado': 'bg-blue-100 text-blue-800 border-blue-200',
  'Bloqueado': 'bg-red-100 text-red-800 border-red-200',
};

const statusBgColors = {
  'Disponível': 'bg-green-500',
  'Reservado': 'bg-yellow-500',
  'Confirmado': 'bg-blue-500',
  'Bloqueado': 'bg-red-500',
};

export const CalendarView: React.FC = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const loadAppointments = async (startDate: Date, endDate: Date) => {
    setLoading(true);
    const { data } = await appointmentService.getAllByDateRange(startDate, endDate);
    if (data) setAppointments(data);
    setLoading(false);
  };

  useEffect(() => {
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    loadAppointments(startOfWeek, endOfWeek);
  }, [currentWeek]);

  const getWeekDays = () => {
    const days: Date[] = [];
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(app => app.date === dateStr);
  };

  const getAppointmentsForDate = (date: Date) => {
    return getAppointmentsForDay(date);
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // HH:MM
  };

  const weekDays = getWeekDays();
  const selectedDayAppointments = getAppointmentsForDate(selectedDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Agenda de Consultas
        </h1>

        <div className="flex items-center gap-3">
          <Link href="/agenda/configuracoes" className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Configurações</span>
          </Link>

          <button
            onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">
            {currentWeek.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Weekly Calendar */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Calendário Semanal</h2>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, index) => (
                <div key={index} className="text-center">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {day.getDate()}
                  </div>
                  <div className="space-y-1 min-h-[200px]">
                    {getAppointmentsForDay(day).map((app) => (
                      <div
                        key={app.id}
                        className={`text-xs p-1 rounded border ${statusColors[app.status]} cursor-pointer hover:opacity-80`}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className="font-medium">{formatTime(app.startTime)}</div>
                        <div className="truncate">{app.treatment || 'Consulta'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <div className="space-y-3">
              {selectedDayAppointments.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum agendamento</p>
              ) : (
                selectedDayAppointments.map((app) => (
                  <div key={app.id} className={`p-3 rounded-lg border ${statusColors[app.status]}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{formatTime(app.startTime)}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusBgColors[app.status]} text-white`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="text-sm">{app.treatment || 'Consulta'}</div>
                    {app.notes && <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">{app.notes}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};