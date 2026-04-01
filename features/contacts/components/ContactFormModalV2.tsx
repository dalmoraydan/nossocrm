import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Contact } from '@/types';
import { Modal, ModalForm } from '@/components/ui/Modal';
import { InputField, SubmitButton } from '@/components/ui/FormField';
import { contactFormSchema } from '@/lib/validations/schemas';
import type { ContactFormData } from '@/lib/validations/schemas';

type ContactFormInput = z.input<typeof contactFormSchema>;

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => void;
  editingContact: Contact | null;
  defaultCompanyName?: string;
}

/**
 * Componente React `ContactFormModalV2`.
 *
 * @param {ContactFormModalProps} {
  isOpen,
  onClose,
  onSubmit,
  editingContact,
  defaultCompanyName = '',
} - Parâmetro `{
  isOpen,
  onClose,
  onSubmit,
  editingContact,
  defaultCompanyName = '',
}`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const ContactFormModalV2: React.FC<ContactFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingContact,
  defaultCompanyName = '',
}) => {
  const form = useForm<ContactFormInput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: editingContact?.name || '',
      email: editingContact?.email || '',
      phone: editingContact?.phone || '',
      treatmentInterest: editingContact?.treatmentInterest || '',
      firstTime: editingContact?.firstTime ?? false,
      previousProcedure: editingContact?.previousProcedure ?? false,
      leadOrigin: editingContact?.leadOrigin || '',
      conversationSummary: editingContact?.conversationSummary || '',
      observations: editingContact?.observations || '',
      role: editingContact?.role || '',
      companyName: defaultCompanyName,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = form;

  // Reset form when modal opens with different contact
  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: editingContact?.name || '',
        email: editingContact?.email || '',
        phone: editingContact?.phone || '',
        treatmentInterest: editingContact?.treatmentInterest || '',
        firstTime: editingContact?.firstTime ?? false,
        previousProcedure: editingContact?.previousProcedure ?? false,
        leadOrigin: editingContact?.leadOrigin || '',
        conversationSummary: editingContact?.conversationSummary || '',
        observations: editingContact?.observations || '',
        role: editingContact?.role || '',
        companyName: defaultCompanyName,
      });
    }
  }, [isOpen, editingContact, defaultCompanyName, reset]);

  const handleFormSubmit = (data: ContactFormInput) => {
    const parsed = contactFormSchema.parse(data);
    onSubmit(parsed);
    onClose();
    reset();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingContact ? 'Editar Contato' : 'Novo Contato'}
    >
      <ModalForm onSubmit={handleSubmit(handleFormSubmit)}>
        <InputField
          label="Nome Completo"
          placeholder="Ex: Ana Souza"
          error={errors.name}
          registration={register('name')}
        />

        <InputField
          label="Email"
          type="email"
          placeholder="ana@empresa.com"
          error={errors.email}
          registration={register('email')}
        />

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Telefone"
            placeholder="+5511999999999"
            hint="Formato E.164 (ex.: +5511999999999)"
            error={errors.phone}
            registration={register('phone')}
          />
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tratamento de Interesse</label>
            <select
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              {...register('treatmentInterest')}
            >
              <option value="">Selecione</option>
              <option value="Botox">Botox</option>
              <option value="Preenchimento labial">Preenchimento labial</option>
              <option value="Bioestimulador">Bioestimulador</option>
              <option value="Fios de sustentação">Fios de sustentação</option>
              <option value="Skinbooster">Skinbooster</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" {...register('firstTime')} />
            Primeira vez
          </label>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" {...register('previousProcedure')} />
            Já fez procedimento antes
          </label>
        </div>

        <InputField
          label="Origem do lead"
          placeholder="WhatsApp, Instagram, Indicação, Google, Outro"
          error={errors.leadOrigin}
          registration={register('leadOrigin')}
        />

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Resumo da conversa</label>
          <textarea
            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            {...register('conversationSummary')}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Observações</label>
          <textarea
            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            {...register('observations')}
          />
        </div>

        <SubmitButton isLoading={isSubmitting}>
          {editingContact ? 'Salvar Alterações' : 'Criar Contato'}
        </SubmitButton>
      </ModalForm>
    </Modal>
  );
};
