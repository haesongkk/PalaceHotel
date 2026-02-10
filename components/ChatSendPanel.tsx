'use client';

import { useState } from 'react';

interface ChatSendPanelProps {
  /** 카카오 userId (이벤트 API용). 없으면 채팅 입력 숨김 */
  userId: string | null;
  /** 채팅 발송 후 콜백 */
  onChatSent?: () => void;
}

export default function ChatSendPanel({ userId, onChatSent }: ChatSendPanelProps) {
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

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
    </div>
  );
}
