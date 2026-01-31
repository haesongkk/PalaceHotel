'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import type { AlimtalkTemplate } from '@/lib/alimtalk';

const STATUS_LABEL: Record<string, string> = {
  R: '대기',
  A: '정상',
  S: '중단',
};

const INSP_STATUS_LABEL: Record<string, string> = {
  REG: '등록',
  REQ: '심사요청',
  APR: '승인',
  REJ: '반려',
};

export default function AlimtalkTemplatesPage() {
  const [templates, setTemplates] = useState<AlimtalkTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AlimtalkTemplate | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/alimtalk/templates');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '목록 조회 실패');
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록 조회 실패');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const canEdit = (t: AlimtalkTemplate) => t.status === 'R' && (t.inspStatus === 'REG' || t.inspStatus === 'REJ');
  const canDelete = (t: AlimtalkTemplate) => t.inspStatus !== 'APR';
  const canRequest = (t: AlimtalkTemplate) => t.status === 'R' && (t.inspStatus === 'REG' || t.inspStatus === 'REJ');

  const handleRequestApproval = async (tpl_code: string) => {
    setActionLoading(tpl_code);
    try {
      const res = await fetch(`/api/alimtalk/templates/${encodeURIComponent(tpl_code)}/request`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '검수 요청 실패');
      alert(data.message ?? '검수 요청이 완료되었습니다. 카카오 검수는 4~5일 소요됩니다.');
      fetchTemplates();
    } catch (e) {
      alert(e instanceof Error ? e.message : '검수 요청 실패');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (tpl_code: string) => {
    if (!confirm('이 템플릿을 삭제하시겠습니까?')) return;
    setActionLoading(tpl_code);
    try {
      const res = await fetch(`/api/alimtalk/templates/${encodeURIComponent(tpl_code)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '삭제 실패');
      fetchTemplates();
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">로딩 중...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">알림톡 템플릿</h1>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            템플릿 등록
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <p className="text-sm text-gray-500 mb-4">
          템플릿 등록 후 &quot;검수 요청&quot;을 하면 카카오 검수가 진행됩니다 (4~5일 소요). 승인(APR)된 템플릿만 발송 가능합니다.
        </p>

        <div className="grid grid-cols-1 gap-4">
          {templates.map((t) => (
            <div
              key={t.templtCode}
              className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{t.templtName}</h3>
                      <span className="text-xs text-gray-500">({t.templtCode})</span>
                    </div>
                    <div className="flex gap-2 mb-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        상태: {STATUS_LABEL[t.status] ?? t.status}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          t.inspStatus === 'APR'
                            ? 'bg-green-100 text-green-800'
                            : t.inspStatus === 'REJ'
                              ? 'bg-red-100 text-red-800'
                              : t.inspStatus === 'REQ'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        승인: {INSP_STATUS_LABEL[t.inspStatus] ?? t.inspStatus}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-md p-4 mb-2">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                        {t.templtContent}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">등록일: {t.cdate}</div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2 shrink-0">
                    {canRequest(t) && (
                      <button
                        type="button"
                        disabled={actionLoading !== null}
                        onClick={() => handleRequestApproval(t.templtCode)}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-50"
                      >
                        {actionLoading === t.templtCode ? '처리 중...' : '검수 요청'}
                      </button>
                    )}
                    {canEdit(t) && (
                      <button
                        type="button"
                        onClick={() => setEditing(t)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        수정
                      </button>
                    )}
                    {canDelete(t) && (
                      <button
                        type="button"
                        disabled={actionLoading !== null}
                        onClick={() => handleDelete(t.templtCode)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {templates.length === 0 && !error && (
          <div className="text-center py-12 text-gray-500">
            등록된 템플릿이 없습니다. &quot;템플릿 등록&quot;으로 추가하세요.
          </div>
        )}
      </div>

      {createOpen && (
        <AlimtalkTemplateFormModal
          onClose={() => {
            setCreateOpen(false);
            fetchTemplates();
          }}
          onSuccess={fetchTemplates}
        />
      )}
      {editing && (
        <AlimtalkTemplateFormModal
          template={editing}
          onClose={() => {
            setEditing(null);
            fetchTemplates();
          }}
          onSuccess={() => {
            setEditing(null);
            fetchTemplates();
          }}
        />
      )}
    </Layout>
  );
}

interface AlimtalkTemplateFormModalProps {
  template?: AlimtalkTemplate;
  onClose: () => void;
  onSuccess: () => void;
}

function AlimtalkTemplateFormModal({ template, onClose, onSuccess }: AlimtalkTemplateFormModalProps) {
  const isEdit = !!template;
  const [tpl_name, setTpl_name] = useState(template?.templtName ?? '');
  const [tpl_content, setTpl_content] = useState(template?.templtContent ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!tpl_name.trim() || !tpl_content.trim()) {
      setErr('템플릿명과 본문은 필수입니다.');
      return;
    }
    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/alimtalk/templates/${encodeURIComponent(template.templtCode)}`
        : '/api/alimtalk/templates';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tpl_name: tpl_name.trim(), tpl_content: tpl_content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? (isEdit ? '수정 실패' : '등록 실패'));
      onSuccess();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {isEdit ? '템플릿 수정' : '템플릿 등록'}
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          변수는 <code className="bg-gray-100 px-1">{'#{변수명}'}</code> 형식으로 입력하세요. (예: {'#{roomType}'}, {'#{checkIn}'}, {'#{checkOut}'}, {'#{totalPrice}'})
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">템플릿명</label>
            <input
              type="text"
              value={tpl_name}
              onChange={(e) => setTpl_name(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="예: 예약 확정 안내"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">본문</label>
            <textarea
              value={tpl_content}
              onChange={(e) => setTpl_content(e.target.value)}
              rows={8}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="[팰리스호텔] 예약이 확정되었습니다.&#10;&#10;객실: #{roomType}&#10;체크인: #{checkIn}&#10;..."
            />
          </div>
          {err && (
            <div className="mb-4 p-2 bg-red-50 text-red-700 text-sm rounded">{err}</div>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '저장 중...' : isEdit ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
