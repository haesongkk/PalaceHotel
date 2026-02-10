'use client';

import { useState, useEffect } from 'react';
import { ChatHistory, ChatMessage } from '@/types';
import AppModal from '@/components/AppModal';
import ChatSendPanel from '@/components/ChatSendPanel';

interface ChatHistoryModalProps {
  history: ChatHistory;
  onClose: () => void;
  /** 유저 이름/전화번호/메모 저장 후 호출 (갱신된 history 전달) */
  onSaved?: (updated: ChatHistory) => void | Promise<void>;
  /** 채팅/알림톡 전송 후 대화 내역 갱신 시 호출 */
  onSent?: () => void;
}

// 카카오톡 메시지 컴포넌트들
function SimpleTextMessage({ text }: { text: string }) {
  return <p className="text-sm whitespace-pre-wrap">{text}</p>;
}

function SimpleImageMessage({ imageUrl, altText }: { imageUrl: string; altText?: string }) {
  return (
    <div className="rounded-lg overflow-hidden">
      <img
        src={imageUrl}
        alt={altText || '이미지'}
        className="max-w-full h-auto"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
        }}
      />
    </div>
  );
}

function TextCardMessage({ card }: { card: { title?: string; description?: string; buttons?: Array<Record<string, unknown>> } }) {
  return (
    <div className="space-y-2">
      {card.title && <h4 className="font-semibold text-base">{card.title}</h4>}
      {card.description && <p className="text-sm text-gray-700 whitespace-pre-wrap">{card.description}</p>}
      {card.buttons && card.buttons.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {card.buttons.map((btn, idx) => (
            <button
              key={idx}
              className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600"
              disabled
            >
              {btn.label as string}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BasicCardMessage({ card }: { card: { title?: string; description?: string; thumbnail?: { imageUrl: string; altText?: string }; buttons?: Array<Record<string, unknown>> } }) {
  return (
    <div className="space-y-3">
      {card.thumbnail && (
        <div className="rounded-lg overflow-hidden">
          <img
            src={card.thumbnail.imageUrl}
            alt={card.thumbnail.altText || '썸네일'}
            className="w-full h-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
            }}
          />
        </div>
      )}
      {card.title && <h4 className="font-semibold text-base">{card.title}</h4>}
      {card.description && <p className="text-sm text-gray-700 whitespace-pre-wrap">{card.description}</p>}
      {card.buttons && card.buttons.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {card.buttons.map((btn, idx) => (
            <button
              key={idx}
              className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600"
              disabled
            >
              {btn.label as string}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CommerceCardMessage({ card }: { card: { title?: string; description?: string; price?: number; currency?: string; discount?: number; discountedPrice?: number; thumbnails?: Array<{ imageUrl: string; altText?: string }>; buttons?: Array<Record<string, unknown>> } }) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  return (
    <div className="space-y-3">
      {card.thumbnails && card.thumbnails.length > 0 && (
        <div className="rounded-lg overflow-hidden">
          <img
            src={card.thumbnails[0].imageUrl}
            alt={card.thumbnails[0].altText || '상품 이미지'}
            className="w-full h-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
            }}
          />
        </div>
      )}
      {card.title && <h4 className="font-semibold text-base">{card.title}</h4>}
      {card.description && <p className="text-sm text-gray-700 whitespace-pre-wrap">{card.description}</p>}
      {card.price !== undefined && (
        <div className="flex items-center gap-2">
          {card.discountedPrice !== undefined ? (
            <>
              <span className="text-lg font-bold text-red-600">{formatPrice(card.discountedPrice)}원</span>
              {card.price !== card.discountedPrice && (
                <span className="text-sm text-gray-400 line-through">{formatPrice(card.price)}원</span>
              )}
              {card.discount && (
                <span className="text-xs text-red-600">({card.discount}원 할인)</span>
              )}
            </>
          ) : (
            <span className="text-lg font-bold">{formatPrice(card.price)}원</span>
          )}
        </div>
      )}
      {card.buttons && card.buttons.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {card.buttons.map((btn, idx) => (
            <button
              key={idx}
              className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600"
              disabled
            >
              {btn.label as string}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ListCardMessage({ card }: { card: { header?: { title: string; description?: string }; items?: Array<{ title: string; description?: string; imageUrl?: string }>; buttons?: Array<Record<string, unknown>> } }) {
  return (
    <div className="space-y-3">
      {card.header && (
        <div className="border-b pb-2">
          <h4 className="font-semibold text-base">{card.header.title}</h4>
          {card.header.description && <p className="text-sm text-gray-600 mt-1">{card.header.description}</p>}
        </div>
      )}
      {card.items && card.items.length > 0 && (
        <div className="space-y-2">
          {card.items.map((item, idx) => (
            <div key={idx} className="flex gap-3 p-2 border rounded-lg hover:bg-gray-50">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-16 h-16 object-cover rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64x64?text=Image';
                  }}
                />
              )}
              <div className="flex-1">
                <h5 className="font-medium text-sm">{item.title}</h5>
                {item.description && <p className="text-xs text-gray-600 mt-1">{item.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {card.buttons && card.buttons.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {card.buttons.map((btn, idx) => (
            <button
              key={idx}
              className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600"
              disabled
            >
              {btn.label as string}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CarouselMessage({ carousel }: { carousel: { type: string; items?: Array<Record<string, unknown>>; header?: { title: string; description?: string } } }) {
  return (
    <div className="space-y-3">
      {carousel.header && (
        <div className="border-b pb-2">
          <h4 className="font-semibold text-base">{carousel.header.title}</h4>
          {carousel.header.description && <p className="text-sm text-gray-600 mt-1">{carousel.header.description}</p>}
        </div>
      )}
      {carousel.items && carousel.items.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
            {carousel.items.map((item, idx) => (
              <div key={idx} className="w-64 flex-shrink-0 border rounded-lg p-3 bg-white">
                {carousel.type === 'commerceCard' && (
                  <CommerceCardMessage card={item as Parameters<typeof CommerceCardMessage>[0]['card']} />
                )}
                {carousel.type === 'basicCard' && (
                  <BasicCardMessage card={item as Parameters<typeof BasicCardMessage>[0]['card']} />
                )}
                {carousel.type === 'listCard' && (
                  <ListCardMessage card={item as Parameters<typeof ListCardMessage>[0]['card']} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickRepliesMessage({ quickReplies }: { quickReplies: Array<{ label: string }> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {quickReplies.map((reply, idx) => (
        <button
          key={idx}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-300 hover:bg-gray-200"
          disabled
        >
          {reply.label}
        </button>
      ))}
    </div>
  );
}

// 메시지 렌더링 메인 컴포넌트
function MessageContent({ message }: { message: ChatMessage }) {
  // 사용자 메시지
  if (message.sender === 'user' && message.userMessage) {
    return <SimpleTextMessage text={message.userMessage.utterance} />;
  }

  // 봇 메시지
  if (message.sender === 'bot' && message.botMessage?.response?.template) {
    const template = message.botMessage.response.template;
    const outputs = template.outputs || [];
    const quickReplies = template.quickReplies || [];

    return (
      <div className="space-y-3">
        {outputs.map((output, idx) => {
          if (output.simpleText) {
            const simpleText = output.simpleText as { text: string };
            return <SimpleTextMessage key={idx} text={simpleText.text} />;
          }
          if (output.simpleImage) {
            const simpleImage = output.simpleImage as { imageUrl: string; altText?: string };
            return <SimpleImageMessage key={idx} imageUrl={simpleImage.imageUrl} altText={simpleImage.altText} />;
          }
          if (output.textCard) {
            return <TextCardMessage key={idx} card={output.textCard as Parameters<typeof TextCardMessage>[0]['card']} />;
          }
          if (output.basicCard) {
            return <BasicCardMessage key={idx} card={output.basicCard as Parameters<typeof BasicCardMessage>[0]['card']} />;
          }
          if (output.commerceCard) {
            return <CommerceCardMessage key={idx} card={output.commerceCard as Parameters<typeof CommerceCardMessage>[0]['card']} />;
          }
          if (output.listCard) {
            return <ListCardMessage key={idx} card={output.listCard as Parameters<typeof ListCardMessage>[0]['card']} />;
          }
          if (output.carousel) {
            return <CarouselMessage key={idx} carousel={output.carousel as Parameters<typeof CarouselMessage>[0]['carousel']} />;
          }
          return null;
        })}
        {quickReplies.length > 0 && <QuickRepliesMessage quickReplies={quickReplies as Array<{ label: string }>} />}
      </div>
    );
  }

  // 하위 호환성: content 필드 사용
  if (message.content) {
    return <SimpleTextMessage text={message.content} />;
  }

  return <p className="text-sm text-gray-400">메시지 내용 없음</p>;
}

export default function ChatHistoryModal({ history: initialHistory, onClose, onSaved, onSent }: ChatHistoryModalProps) {
  const [history, setHistory] = useState(initialHistory);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(initialHistory.userName ?? '');
  const [editPhone, setEditPhone] = useState(initialHistory.userPhone ?? '');
  const [editMemo, setEditMemo] = useState(initialHistory.memo ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHistory(initialHistory);
    if (!editing) {
      setEditName(initialHistory.userName ?? '');
      setEditPhone(initialHistory.userPhone ?? '');
      setEditMemo(initialHistory.memo ?? '');
    }
  }, [initialHistory, editing]);

  const formatName = (userId: string) =>
    userId.length <= 8 ? userId : userId.slice(0, 8) + '…';
  const displayName = history.userName?.trim() || formatName(history.userId);
  const phone = history.userPhone?.trim() || '-';
  const phoneForAlimtalk = phone === '-' ? null : phone;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/chat-histories/${history.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: editName.trim() || undefined,
          userPhone: editPhone.trim() || undefined,
          memo: editMemo.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('저장 실패');
      const updated = await res.json();
      setHistory(updated);
      setEditing(false);
      await onSaved?.(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(history.userName ?? '');
    setEditPhone(history.userPhone ?? '');
    setEditMemo(history.memo ?? '');
    setEditing(false);
  };

  /** 채팅/알림톡 전송 후 대화 내역 새로고침 */
  const handleSent = async () => {
    onSent?.();
    try {
      const res = await fetch(`/api/chat-histories?userId=${encodeURIComponent(history.userId)}`);
      if (res.ok) {
        const updated = await res.json();
        setHistory(updated);
      }
    } catch {
      // 무시
    }
  };

  return (
    <AppModal
      title="대화 내역"
      subtitle={`${displayName} (${phone})`}
      onClose={onClose}
      scrollable
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          닫기
        </button>
      }
    >
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">유저 정보 (관리자 수정)</h4>
              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  수정
                </button>
              ) : null}
            </div>
            {editing ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">이름</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="표시 이름"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">전화번호</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="010-1234-5678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">메모</label>
                    <textarea
                      value={editMemo}
                      onChange={(e) => setEditMemo(e.target.value)}
                      placeholder="관리자 메모"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? '저장 중…' : '저장'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 disabled:opacity-50"
                  >
                    취소
                  </button>
                </div>
              </>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-gray-500">이름</span>
                  <p className="text-gray-900">{history.userName?.trim() || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">전화번호</span>
                  <p className="text-gray-900">{phone === '-' ? '-' : phone}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-gray-500">메모</span>
                  <p className="text-gray-900 whitespace-pre-wrap">{history.memo?.trim() || '-'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {history.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl px-4 py-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900 border border-gray-200'
                  }`}
                >
                  <MessageContent message={message} />
                  <p
                    className={`text-xs mt-2 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {formatDate(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
            <p>대화 시작: {formatDate(history.createdAt)}</p>
            {history.updatedAt !== history.createdAt && (
              <p>마지막 메시지: {formatDate(history.updatedAt)}</p>
            )}
          </div>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <ChatSendPanel userId={history.userId} onChatSent={handleSent} />
      </div>
    </AppModal>
  );
}

