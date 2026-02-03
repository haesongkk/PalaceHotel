'use client';

import { useState, useEffect } from 'react';

const TEMPLATE_VAR_REGEX = /#\{([^}]+)\}/g;
function extractTemplateVariables(content: string): string[] {
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = TEMPLATE_VAR_REGEX.exec(content)) !== null) set.add(m[1].trim());
  return Array.from(set);
}

function formatDateForAlimtalk(dateString: string): string {
  const d = new Date(dateString);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export interface AlimtalkTemplateItem {
  templtCode: string;
  templtName: string;
  templtContent: string;
  inspStatus: string;
  status: string;
}

export interface ChatSendPanelReservationContext {
  roomType: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  reservationId: string;
}

interface ChatSendPanelProps {
  /** 카카오 userId (이벤트 API용). 없으면 채팅 입력 숨김 */
  userId: string | null;
  /** 수신 전화번호 (알림톡용). 없거나 '-'면 빠른 입력 숨김 */
  phone: string | null;
  /** 예약 정보 (템플릿 변수 기본값) */
  reservationContext?: ChatSendPanelReservationContext | null;
  /** 알림톡 발송 후 콜백 */
  onAlimtalkSent?: () => void;
  /** 채팅 발송 후 콜백 */
  onChatSent?: () => void;
}

export default function ChatSendPanel({
  userId,
  phone,
  reservationContext,
  onAlimtalkSent,
  onChatSent,
}: ChatSendPanelProps) {
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [templates, setTemplates] = useState<AlimtalkTemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTplCode, setSelectedTplCode] = useState<string>('');
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [sendingAlimtalk, setSendingAlimtalk] = useState(false);

  const canUseAlimtalk = phone && phone !== '-';
  const selectedTemplate = templates.find((t) => t.templtCode === selectedTplCode);
  const paramKeys = selectedTemplate ? extractTemplateVariables(selectedTemplate.templtContent) : [];

  useEffect(() => {
    if (!canUseAlimtalk) return;
    setLoadingTemplates(true);
    fetch('/api/alimtalk/templates')
      .then((res) => (res.ok ? res.json() : []))
      .then((list: AlimtalkTemplateItem[]) => {
        const sendable = (list ?? []).filter((t) => t.inspStatus === 'APR' && t.status !== 'S');
        setTemplates(sendable);
        if (sendable.length > 0 && !selectedTplCode) setSelectedTplCode(sendable[0].templtCode);
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, [canUseAlimtalk]);

  useEffect(() => {
    if (!selectedTemplate || !reservationContext) return;
    const next: Record<string, string> = { ...templateParams };
    const { roomType, checkIn, checkOut, totalPrice, reservationId } = reservationContext;
    if (paramKeys.includes('roomType')) next['roomType'] = roomType;
    if (paramKeys.includes('checkIn')) next['checkIn'] = formatDateForAlimtalk(checkIn);
    if (paramKeys.includes('checkOut')) next['checkOut'] = formatDateForAlimtalk(checkOut);
    if (paramKeys.includes('totalPrice')) next['totalPrice'] = String(totalPrice);
    if (paramKeys.includes('예약ID')) next['예약ID'] = reservationId;
    setTemplateParams((prev) => ({ ...prev, ...next }));
  }, [selectedTplCode, reservationContext?.reservationId]);

  const handleSendChat = async () => {
    if (!userId || !chatText.trim()) return;
    setSendingChat(true);
    try {
      const res = await fetch('/api/kakao/event/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, text: chatText.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status !== 'FAIL' && data.status !== 'ERROR') {
        setChatText('');
        onChatSent?.();
      } else {
        alert(data.message || data.error || '채팅 전송에 실패했습니다.');
      }
    } catch {
      alert('채팅 전송에 실패했습니다.');
    } finally {
      setSendingChat(false);
    }
  };

  const handleSendAlimtalk = async () => {
    if (!canUseAlimtalk || !selectedTplCode) return;
    setSendingAlimtalk(true);
    try {
      const res = await fetch('/api/alimtalk/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tpl_code: selectedTplCode,
          receiver: phone,
          subject: selectedTemplate?.templtName ?? '알림',
          params: templateParams,
          ...(userId ? { userId } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.code === 0) {
        setTemplateParams({});
        onAlimtalkSent?.();
      } else {
        alert(data.message || data.error || '알림톡 발송에 실패했습니다.');
      }
    } catch {
      alert('알림톡 발송에 실패했습니다.');
    } finally {
      setSendingAlimtalk(false);
    }
  }

  return (
    <div className="border-t bg-gray-50 p-4 space-y-4">
      {userId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">채팅 입력 (이벤트 API)</label>
          <div className="flex gap-2">
            <textarea
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="보낼 메시지를 입력하세요"
              rows={2}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleSendChat}
              disabled={sendingChat || !chatText.trim()}
              className="self-end px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
            >
              {sendingChat ? '전송 중…' : '전송'}
            </button>
          </div>
        </div>
      )}

      {canUseAlimtalk && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">빠른 입력 (알림톡)</label>
          {loadingTemplates ? (
            <p className="text-sm text-gray-500">템플릿 불러오는 중…</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-500">발송 가능한 알림톡 템플릿이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              <select
                value={selectedTplCode}
                onChange={(e) => {
                  setSelectedTplCode(e.target.value);
                  setTemplateParams({});
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {templates.map((t) => (
                  <option key={t.templtCode} value={t.templtCode}>
                    {t.templtName}
                  </option>
                ))}
              </select>
              {paramKeys.length > 0 && (
                <div className="space-y-1">
                  {paramKeys.map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-24 shrink-0">#{key}</span>
                      <input
                        type="text"
                        value={templateParams[key] ?? ''}
                        onChange={(e) => setTemplateParams((p) => ({ ...p, [key]: e.target.value }))}
                        placeholder={`${key} 입력`}
                        className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={handleSendAlimtalk}
                disabled={sendingAlimtalk}
                className="w-full px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {sendingAlimtalk ? '발송 중…' : '알림톡 전송'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
