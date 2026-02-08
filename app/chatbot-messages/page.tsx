'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { ChatbotMessage, ChatbotSituation } from '@/types';
import ChatbotMessageModal from '@/components/ChatbotMessageModal';
import type { AlimtalkTemplate } from '@/lib/alimtalk';
import {
  ALIMTALK_DISPLAY_NAMES,
  ALIMTALK_USAGE_DESCRIPTIONS,
  ALIMTALK_VARIABLE_DESCRIPTIONS,
  type AlimtalkDisplayName,
} from '@/lib/alimtalk-config';

const situationLabels: Record<ChatbotSituation, string> = {
  channel_added: '채널 추가시',
  today_day_use: '오늘대실 선택시',
  today_stay: '오늘숙박 선택시',
  saturday_reservation: '토요일예약 선택시',
  make_reservation: '예약하기 선택시',
  phone_input_request: '전화번호 입력 요청시',
  reservation_request: '예약 요청시',
  reservation_inquiry: '예약내역 조회시',
  reservation_cancel: '예약 취소시',
};

const INSP_STATUS_LABEL: Record<string, string> = {
  REG: '등록',
  REQ: '심사요청',
  APR: '승인',
  REJ: '반려',
};

function sanitizeDisplayName(name: string): string {
  return name.replace(/\s+/g, '');
}

interface TemplateDisplayItem {
  displayName: AlimtalkDisplayName;
  template: AlimtalkTemplate | null;
  activeTplCode: string | null;
}

export default function ChatbotMessagesPage() {
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatbotMessage | null>(null);
  const [loading, setLoading] = useState(true);

  const [templates, setTemplates] = useState<AlimtalkTemplate[]>([]);
  const [templateHistory, setTemplateHistory] = useState<
    Record<string, { history: Array<{ tplCode: string; content: string; savedAt: string }>; activeTplCode: string | null }>
  >({});
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState<AlimtalkDisplayName | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<AlimtalkTemplate | null>(null);
  const [connectDisplayName, setConnectDisplayName] = useState<AlimtalkDisplayName | null>(null);
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
      const [listRes, ...historyRes] = await Promise.all([
        fetch('/api/alimtalk/templates'),
        ...ALIMTALK_DISPLAY_NAMES.map((d) =>
          fetch(`/api/alimtalk/template-history?displayName=${encodeURIComponent(d)}`)
        ),
      ]);
      const listData = await listRes.json();
      if (!listRes.ok) throw new Error(listData.error ?? '목록 조회 실패');
      setTemplates(Array.isArray(listData) ? listData : []);

      const hist: typeof templateHistory = {};
      for (let i = 0; i < ALIMTALK_DISPLAY_NAMES.length; i++) {
        const d = ALIMTALK_DISPLAY_NAMES[i];
        const h = await historyRes[i].json();
        hist[d] = {
          history: Array.isArray(h?.history) ? h.history : [],
          activeTplCode: h?.activeTplCode ?? null,
        };
      }
      setTemplateHistory(hist);
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

  const templateDisplayItems: TemplateDisplayItem[] = ALIMTALK_DISPLAY_NAMES.map((displayName) => {
    const prefix = sanitizeDisplayName(displayName) + '_';
    const matching = templates.filter(
      (t) => (t.templtName ?? '').startsWith(prefix) || (displayName === '예약 요청 알림' && t.templtName === '관리자 알림')
    );
    const active = templateHistory[displayName]?.activeTplCode;
    const activeT = matching.find((x) => x.templtCode === active) ?? matching.find((x) => x.inspStatus === 'APR') ?? matching[0];
    return {
      displayName,
      template: activeT ?? null,
      activeTplCode: active ?? activeT?.templtCode ?? null,
    };
  });

  const canRequestTemplate = (t: AlimtalkTemplate) =>
    t.status === 'R' && (t.inspStatus === 'REG' || t.inspStatus === 'REJ');
  const canDeleteTemplate = (t: AlimtalkTemplate) => t.inspStatus !== 'APR';

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
      if (!res.ok) throw new Error((await res.json()).error ?? '삭제 실패');
      fetchTemplates();
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    } finally {
      setActionLoading(null);
    }
  };

  const openTemplateModal = (displayName: AlimtalkDisplayName, template: AlimtalkTemplate | null) => {
    setEditingDisplayName(displayName);
    setEditingTemplate(template);
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {situationLabels[message.situation]}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">{message.description}</p>
                      <div className="bg-gray-50 rounded-md p-4 mb-3">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.message}</p>
                      </div>
                      <div className="text-xs text-gray-400">마지막 수정: {formatDate(message.updatedAt)}</div>
                    </div>
                    <div className="ml-6">
                      <button
                        onClick={() => handleEdit(message)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
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
              onClick={() => {
                setEditingDisplayName(null);
                setEditingTemplate(null);
                setCreateTemplateOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              템플릿 등록
            </button>
          </div>
          {templateError && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{templateError}</div>
          )}
          <p className="text-sm text-gray-500 mb-4">
            템플릿 등록 후 &quot;검수 요청&quot;을 하면 카카오 검수가 진행됩니다 (4~5일 소요). 승인(APR)된 템플릿만
            발송 가능합니다.
          </p>
          {loadingTemplates ? (
            <p className="text-sm text-gray-500">템플릿 목록 불러오는 중...</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {templateDisplayItems.map((item) => (
                <div
                  key={item.displayName}
                  className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{item.displayName}</h3>
                          {item.template && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                item.template.inspStatus === 'APR'
                                  ? 'bg-green-100 text-green-800'
                                  : item.template.inspStatus === 'REJ'
                                    ? 'bg-red-100 text-red-800'
                                    : item.template.inspStatus === 'REQ'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {INSP_STATUS_LABEL[item.template.inspStatus] ?? item.template.inspStatus}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{ALIMTALK_USAGE_DESCRIPTIONS[item.displayName]}</p>
                        {item.template && (
                          <>
                            <div className="bg-gray-50 rounded-md p-4 mb-2">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                                {item.template.templtContent}
                              </p>
                            </div>
                            <div className="text-xs text-gray-400">마지막 수정: {item.template.cdate}</div>
                          </>
                        )}
                        {!item.template && (
                          <p className="text-sm text-gray-400 italic">등록된 템플릿 없음</p>
                        )}
                      </div>
                      <div className="ml-4 flex flex-col gap-2 shrink-0">
                        {item.template && canRequestTemplate(item.template) && (
                          <button
                            type="button"
                            disabled={actionLoading !== null}
                            onClick={() => handleRequestApproval(item.template!.templtCode)}
                            className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-50"
                          >
                            {actionLoading === item.template?.templtCode ? '처리 중...' : '검수 요청'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openTemplateModal(item.displayName, item.template)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          {item.template ? '수정' : '등록'}
                        </button>
                        {item.template && canDeleteTemplate(item.template) && (
                          <button
                            type="button"
                            disabled={actionLoading !== null}
                            onClick={() => handleDeleteTemplate(item.template!.templtCode)}
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
        </section>
      </div>

      {isModalOpen && editingMessage && (
        <ChatbotMessageModal message={editingMessage} onClose={handleModalClose} />
      )}

      {createTemplateOpen && (
        <AlimtalkTemplateFormModal
          displayName={null}
          template={null}
          onClose={() => {
            setCreateTemplateOpen(false);
            fetchTemplates();
          }}
          onSuccess={fetchTemplates}
          fetchHistory={fetchTemplates}
          onOpenConnect={(dn) => {
            setCreateTemplateOpen(false);
            setConnectDisplayName(dn);
          }}
        />
      )}
      {editingDisplayName && (
        <AlimtalkTemplateFormModal
          displayName={editingDisplayName}
          template={editingTemplate}
          onClose={() => {
            setEditingDisplayName(null);
            setEditingTemplate(null);
            fetchTemplates();
          }}
          onSuccess={() => {
            setEditingDisplayName(null);
            setEditingTemplate(null);
            fetchTemplates();
          }}
          fetchHistory={fetchTemplates}
          onOpenConnect={(dn) => {
            setEditingDisplayName(null);
            setEditingTemplate(null);
            setConnectDisplayName(dn);
          }}
        />
      )}
      {connectDisplayName && (
        <ConnectTemplateModal
          displayName={connectDisplayName}
          templates={templates}
          onClose={() => setConnectDisplayName(null)}
          onSuccess={() => {
            setConnectDisplayName(null);
            fetchTemplates();
          }}
        />
      )}
    </Layout>
  );
}

interface ConnectTemplateModalProps {
  displayName: AlimtalkDisplayName;
  templates: AlimtalkTemplate[];
  onClose: () => void;
  onSuccess: () => void;
}

function ConnectTemplateModal({ displayName, templates, onClose, onSuccess }: ConnectTemplateModalProps) {
  const sendable = templates.filter((t) => t.inspStatus === 'APR' && t.status !== 'S');
  const others = templates.filter((t) => !(t.inspStatus === 'APR' && t.status !== 'S'));
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = async (tplCode: string) => {
    setConnecting(tplCode);
    try {
      const tpl = templates.find((t) => t.templtCode === tplCode);
      const res1 = await fetch('/api/alimtalk/template-active', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, tplCode }),
      });
      if (!res1.ok) throw new Error('연결 실패');
      if (tpl) {
        await fetch('/api/alimtalk/template-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName, tplCode, content: tpl.templtContent }),
        });
      }
      onSuccess();
    } catch {
      alert('연결에 실패했습니다.');
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            기존 템플릿 연결: {displayName}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Aligo에 등록된 템플릿 중 &quot;{displayName}&quot;으로 사용할 템플릿을 선택하세요.
        </p>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sendable.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-500">발송 가능 (승인됨)</p>
              {sendable.map((t) => (
                <div
                  key={t.templtCode}
                  className="border rounded-md p-3 flex justify-between items-start gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{t.templtName}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.templtCode}</p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2 whitespace-pre-wrap break-words">
                      {t.templtContent}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={connecting !== null}
                    onClick={() => handleConnect(t.templtCode)}
                    className="shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {connecting === t.templtCode ? '연결 중...' : '연결'}
                  </button>
                </div>
              ))}
            </>
          )}
          {others.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-500 mt-4">기타</p>
              {others.map((t) => (
                <div
                  key={t.templtCode}
                  className="border rounded-md p-3 flex justify-between items-start gap-4 opacity-75"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{t.templtName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t.templtCode} · {INSP_STATUS_LABEL[t.inspStatus] ?? t.inspStatus}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2 whitespace-pre-wrap break-words">
                      {t.templtContent}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={connecting !== null}
                    onClick={() => handleConnect(t.templtCode)}
                    className="shrink-0 px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {connecting === t.templtCode ? '연결 중...' : '연결'}
                  </button>
                </div>
              ))}
            </>
          )}
          {templates.length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">등록된 템플릿이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface AlimtalkTemplateFormModalProps {
  displayName: AlimtalkDisplayName | null;
  template: AlimtalkTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
  fetchHistory: () => void;
  onOpenConnect?: (displayName: AlimtalkDisplayName) => void;
}

function AlimtalkTemplateFormModal({
  displayName,
  template,
  onClose,
  onSuccess,
  fetchHistory,
  onOpenConnect,
}: AlimtalkTemplateFormModalProps) {
  const isCreate = !displayName && !template;
  const [selectedDisplayName, setSelectedDisplayName] = useState<AlimtalkDisplayName | ''>(
    displayName ?? ''
  );
  const [tpl_content, setTpl_content] = useState(template?.templtContent ?? '');
  const [history, setHistory] = useState<Array<{ tplCode: string; content: string; savedAt: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const effectiveDisplayName: AlimtalkDisplayName | null =
    displayName ?? (selectedDisplayName ? (selectedDisplayName as AlimtalkDisplayName) : null);

  useEffect(() => {
    if (effectiveDisplayName) {
      fetch(`/api/alimtalk/template-history?displayName=${encodeURIComponent(effectiveDisplayName)}`)
        .then((r) => r.json())
        .then((d) => setHistory(Array.isArray(d?.history) ? d.history : []))
        .catch(() => setHistory([]));
    } else {
      setHistory([]);
    }
  }, [effectiveDisplayName]);

  useEffect(() => {
    if (template) setTpl_content(template.templtContent);
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const dn = effectiveDisplayName;
    if (!dn || !tpl_content.trim()) {
      setErr('템플릿 종류와 본문은 필수입니다.');
      return;
    }
    setSubmitting(true);
    try {
      if (template && template.inspStatus === 'APR') {
        await fetch('/api/alimtalk/template-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: dn,
            tplCode: template.templtCode,
            content: template.templtContent,
          }),
        });
        const res = await fetch('/api/alimtalk/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: dn, tpl_content: tpl_content.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '등록 실패');
        onSuccess();
        onClose();
      } else if (template) {
        const res = await fetch(`/api/alimtalk/templates/${encodeURIComponent(template.templtCode)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tpl_name: template.templtName, tpl_content: tpl_content.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '수정 실패');
        onSuccess();
        onClose();
      } else {
        const res = await fetch('/api/alimtalk/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: dn, tpl_content: tpl_content.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '등록 실패');
        onSuccess();
        onClose();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetActive = async (tplCode: string) => {
    if (!effectiveDisplayName) return;
    try {
      const res = await fetch('/api/alimtalk/template-active', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: effectiveDisplayName, tplCode }),
      });
      if (res.ok) fetchHistory();
    } catch {
      alert('설정 실패');
    }
  };

  const handleDeleteHistory = async (tplCode: string) => {
    if (!effectiveDisplayName || !confirm('이 이전 메시지를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch('/api/alimtalk/template-history/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: effectiveDisplayName, tplCode }),
      });
      if (res.ok) fetchHistory();
    } catch {
      alert('삭제 실패');
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {isCreate ? '템플릿 등록' : '템플릿 수정'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">템플릿 이름</label>
                {displayName ? (
                  <div className="px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                    {displayName}
                  </div>
                ) : (
                  <select
                    value={selectedDisplayName}
                    onChange={(e) => setSelectedDisplayName(e.target.value as AlimtalkDisplayName | '')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">선택하세요</option>
                    {ALIMTALK_DISPLAY_NAMES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {effectiveDisplayName && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">사용 시점</label>
                    <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
                      {ALIMTALK_USAGE_DESCRIPTIONS[effectiveDisplayName]}
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">사용 가능한 변수</label>
                    <p className="text-sm text-gray-500">
                      {ALIMTALK_VARIABLE_DESCRIPTIONS[effectiveDisplayName]}
                    </p>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">본문</label>
                    <textarea
                      value={tpl_content}
                      onChange={(e) => setTpl_content(e.target.value)}
                      rows={10}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="[팰리스호텔] 예약이 확정되었습니다.&#10;&#10;객실: #{roomType}&#10;..."
                    />
                  </div>
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이전 메시지 (최대 3개)</label>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {history.slice(0, 3).map((h) => (
                  <div
                    key={h.tplCode}
                    className="border rounded-md p-3 bg-gray-50 text-sm"
                  >
                    <p className="whitespace-pre-wrap break-words mb-2 line-clamp-4">{h.content}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{formatDate(h.savedAt)}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetActive(h.tplCode)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                        >
                          이걸로 사용
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistory(h.tplCode)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <p className="text-sm text-gray-400 py-4">이전 메시지 없음</p>
                )}
              </div>
            </div>
          </div>
          {err && (
            <div className="mt-4 p-2 bg-red-50 text-red-700 text-sm rounded">{err}</div>
          )}
          <div className="flex gap-2 justify-end mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            {effectiveDisplayName && onOpenConnect && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenConnect(effectiveDisplayName);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                기존 템플릿 연결
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || !effectiveDisplayName}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '저장 중...' : template?.inspStatus === 'APR' ? '새로 등록' : isCreate ? '등록' : '수정'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
