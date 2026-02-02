'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { ChatbotMessage, ChatbotSituation } from '@/types';
import ChatbotMessageModal from '@/components/ChatbotMessageModal';
import type { AlimtalkTemplate } from '@/lib/alimtalk';

const situationLabels: Record<ChatbotSituation, string> = {
  channel_added: '채널 추가시',
  today_day_use: '오늘대실 선택시',
  today_stay: '오늘숙박 선택시',
  saturday_reservation: '토요일예약 선택시',
  make_reservation: '예약하기 선택시',
  phone_input_request: '전화번호 입력 요청시',
  reservation_request: '예약 요청시',
  reservation_inquiry: '예약내역 조회시',
};

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

const SYSTEM_TEMPLATE_NAMES = ['관리자 알림', '예약 확정 안내', '예약 거절 안내'];

export default function ChatbotMessagesPage() {
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatbotMessage | null>(null);
  const [loading, setLoading] = useState(true);

  const [templates, setTemplates] = useState<AlimtalkTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AlimtalkTemplate | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/chatbot-messages');
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    setTemplateError(null);
    try {
      const res = await fetch('/api/alimtalk/templates');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '목록 조회 실패');
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      setTemplateError(e instanceof Error ? e.message : '목록 조회 실패');
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleEdit = (message: ChatbotMessage) => {
    setEditingMessage(message);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingMessage(null);
    fetchMessages();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canEditTemplate = (t: AlimtalkTemplate) => t.status === 'R' && (t.inspStatus === 'REG' || t.inspStatus === 'REJ');
  const canDeleteTemplate = (t: AlimtalkTemplate) => t.inspStatus !== 'APR';
  const canRequestTemplate = (t: AlimtalkTemplate) => t.status === 'R' && (t.inspStatus === 'REG' || t.inspStatus === 'REJ');

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

  const handleDeleteTemplate = async (tpl_code: string) => {
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

  const isSystemTemplate = (name: string) => SYSTEM_TEMPLATE_NAMES.includes(name);

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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">카카오톡 챗봇 멘트 관리</h1>

        {/* 챗봇 응답 멘트 섹션 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">챗봇 응답 멘트</h2>
          <div className="grid grid-cols-1 gap-4">
            {messages.map((message) => (
              <div
                key={message.situation}
                className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {situationLabels[message.situation]}
                        </h3>
                      </div>
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-2">
                          <span className="font-medium">사용 시점:</span> {message.description}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-md p-4 mb-4">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {message.message}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400">
                        마지막 수정: {formatDate(message.updatedAt)}
                      </div>
                    </div>
                    <div className="ml-6">
                      <button
                        onClick={() => handleEdit(message)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
                      >
                        수정
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 알림톡 템플릿 섹션 */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">알림톡 템플릿</h2>
            <button
              type="button"
              onClick={() => setCreateTemplateOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              템플릿 등록
            </button>
          </div>
          {templateError && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{templateError}</div>
          )}
          <p className="text-sm text-gray-500 mb-4">
            템플릿 등록 후 &quot;검수 요청&quot;을 하면 카카오 검수가 진행됩니다 (4~5일 소요). 승인(APR)된 템플릿만 발송 가능합니다.
            <br />
            <span className="font-medium text-gray-700">
              &quot;관리자 알림&quot;, &quot;예약 확정 안내&quot;, &quot;예약 거절 안내&quot;
            </span>
            의 세 가지 템플릿은 시스템에서 자동으로 사용됩니다.
          </p>
          {loadingTemplates ? (
            <p className="text-sm text-gray-500">템플릿 목록 불러오는 중...</p>
          ) : (
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
                          {isSystemTemplate(t.templtName) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                              시스템 사용
                            </span>
                          )}
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
                        {canRequestTemplate(t) && (
                          <button
                            type="button"
                            disabled={actionLoading !== null}
                            onClick={() => handleRequestApproval(t.templtCode)}
                            className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-50"
                          >
                            {actionLoading === t.templtCode ? '처리 중...' : '검수 요청'}
                          </button>
                        )}
                        {canEditTemplate(t) && (
                          <button
                            type="button"
                            onClick={() => setEditingTemplate(t)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            수정
                          </button>
                        )}
                        {canDeleteTemplate(t) && (
                          <button
                            type="button"
                            disabled={actionLoading !== null}
                            onClick={() => handleDeleteTemplate(t.templtCode)}
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
          )}
          {!loadingTemplates && templates.length === 0 && !templateError && (
            <div className="text-center py-12 text-gray-500">
              등록된 템플릿이 없습니다. &quot;템플릿 등록&quot;으로 추가하세요.
            </div>
          )}
        </section>
      </div>

      {isModalOpen && editingMessage && (
        <ChatbotMessageModal message={editingMessage} onClose={handleModalClose} />
      )}

      {createTemplateOpen && (
        <AlimtalkTemplateFormModal
          onClose={() => {
            setCreateTemplateOpen(false);
            fetchTemplates();
          }}
          onSuccess={fetchTemplates}
        />
      )}
      {editingTemplate && (
        <AlimtalkTemplateFormModal
          template={editingTemplate}
          onClose={() => {
            setEditingTemplate(null);
            fetchTemplates();
          }}
          onSuccess={() => {
            setEditingTemplate(null);
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
        ? `/api/alimtalk/templates/${encodeURIComponent(template!.templtCode)}`
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
          변수는 <code className="bg-gray-100 px-1">{'#{변수명}'}</code> 형식으로 입력하세요. (예: {'#{roomType}'}, {'#{checkIn}'}, {'#{checkOut}'}, {'#{totalPrice}'}, {'#{예약ID}'})
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
