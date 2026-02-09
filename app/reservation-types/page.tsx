'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import type { ReservationType } from '@/types';

export default function ReservationTypesPage() {
  const [types, setTypes] = useState<ReservationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [color, setColor] = useState('bg-emerald-100 text-emerald-800');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reservation-types');
      const data: ReservationType[] = await res.json();
      setTypes(data);
    } catch (e) {
      console.error('Failed to fetch reservation types:', e);
      setTypes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !color.trim()) {
      alert('이름과 색상을 모두 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reservation-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color: color.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? '예약 타입 생성에 실패했습니다.');
        return;
      }
      setName('');
      setColor('bg-emerald-100 text-emerald-800');
      await fetchTypes();
    } catch (e) {
      console.error(e);
      alert('예약 타입 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (type: ReservationType) => {
    setEditingId(type.id);
    setEditingName(type.name);
    setEditingColor(type.color);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingColor('');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editingName.trim() || !editingColor.trim()) {
      alert('이름과 색상을 모두 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reservation-types/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim(), color: editingColor.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? '수정에 실패했습니다.');
        return;
      }
      await fetchTypes();
      handleCancelEdit();
    } catch (e) {
      console.error(e);
      alert('수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 예약 타입을 삭제하시겠습니까?\n기존 예약에는 계속 예전 이름/색상 없이 남을 수 있습니다.')) return;
    try {
      const res = await fetch(`/api/reservation-types/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? '삭제에 실패했습니다.');
        return;
      }
      await fetchTypes();
    } catch (e) {
      console.error(e);
      alert('삭제에 실패했습니다.');
    }
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">예약 타입 관리</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">새 예약 타입 추가</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                  placeholder="예: 전화, OTA, 워킹"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  색상 클래스
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm font-mono"
                  placeholder="예: bg-emerald-100 text-emerald-800"
                  required
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Tailwind 클래스 조합을 입력하면 됩니다. (예: bg-blue-100 text-blue-800)
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '추가 중...' : '추가'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">예약 타입 목록</h2>
              <p className="text-xs text-gray-500">
                카톡 예약은 항상 &quot;카톡&quot;으로 표시되며 여기서 수정할 수 없습니다.
              </p>
            </div>
            {loading ? (
              <div className="py-8 text-center text-gray-500 text-sm">불러오는 중...</div>
            ) : types.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm border border-dashed border-gray-200 rounded-md">
                등록된 예약 타입이 없습니다. 수기 예약 유형을 추가해보세요.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {types.map((t) => {
                  const isEditing = editingId === t.id;
                  return (
                    <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${t.color}`}
                        >
                          {t.name}
                        </span>
                        <div className="min-w-0">
                          {isEditing ? (
                            <>
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="mb-1 w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                              />
                              <input
                                type="text"
                                value={editingColor}
                                onChange={(e) => setEditingColor(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs font-mono"
                              />
                            </>
                          ) : (
                            <div className="text-xs text-gray-500 font-mono break-all">
                              {t.color}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={submitting}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(t)}
                              className="px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(t.id)}
                              className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded-md hover:bg-red-100"
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

