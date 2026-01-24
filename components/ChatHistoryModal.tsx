'use client';

import { ChatHistory, ChatMessage } from '@/types';
import Image from 'next/image';

interface ChatHistoryModalProps {
  history: ChatHistory;
  onClose: () => void;
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

export default function ChatHistoryModal({ history, onClose }: ChatHistoryModalProps) {
  // userId를 일부만 표시하는 헬퍼 함수
  const formatUserId = (userId: string) => {
    if (userId.length <= 8) return userId;
    return userId.substring(0, 8) + '...';
  };

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

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">대화 내역</h3>
              <p className="text-sm text-gray-500 mt-1">
                {history.userName ? (
                  <>
                    {history.userName} ({formatUserId(history.userId)})
                  </>
                ) : (
                  <>
                    사용자 {formatUserId(history.userId)} ({formatUserId(history.userId)})
                  </>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

