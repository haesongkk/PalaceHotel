'use client';

import { useState, useEffect } from 'react';
import AppModal from './AppModal';

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('010')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits || phone;
}

function normalizePhone(input: string): string {
  return input.trim().replace(/\D/g, '');
}

export interface AdminSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AdminSettingsModal({ open, onClose }: AdminSettingsModalProps) {
  const [phones, setPhones] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    fetch('/api/settings/admin-phones')
      .then((res) => res.json())
      .then((data) => {
        setPhones(Array.isArray(data?.phones) ? data.phones : []);
      })
      .catch(() => setError('목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [open]);

  const addPhone = () => {
    const digits = normalizePhone(newPhone);
    if (!digits) return;
    if (digits.length < 10) {
      setError('전화번호를 올바르게 입력해 주세요.');
      return;
    }
    if (phones.includes(digits)) {
      setError('이미 등록된 번호입니다.');
      return;
    }
    setError(null);
    setPhones((prev) => [...prev, digits]);
    setNewPhone('');
  };

  const removePhone = (index: number) => {
    setPhones((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const save = () => {
    setSaving(true);
    setError(null);
    fetch('/api/settings/admin-phones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phones }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('저장 실패');
        onClose();
      })
      .catch(() => setError('저장에 실패했습니다.'))
      .finally(() => setSaving(false));
  };

  if (!open) return null;

  return (
    <AppModal
      title="설정"
      subtitle="알림톡 수신 관리자 번호를 등록하면 예약 요청·취소 시 해당 번호로 알림이 발송됩니다."
      onClose={onClose}
      size="md"
      footer={
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-sm text-red-600" role="alert">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            알림톡 수신 관리자 번호
          </label>
          {loading ? (
            <p className="text-sm text-gray-500">불러오는 중…</p>
          ) : (
            <>
              <ul className="mb-3 space-y-2">
                {phones.length === 0 ? (
                  <li className="text-sm text-gray-500">등록된 번호가 없습니다. 아래에서 추가해 주세요.</li>
                ) : (
                  phones.map((p, i) => (
                    <li
                      key={`${p}-${i}`}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                    >
                      <span className="font-mono text-gray-800">{formatPhoneDisplay(p)}</span>
                      <button
                        type="button"
                        onClick={() => removePhone(i)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPhone())}
                  placeholder="01012345678 또는 010-1234-5678"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addPhone}
                  className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                >
                  추가
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppModal>
  );
}
