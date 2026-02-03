'use client';

import { ReactNode } from 'react';

export interface AppModalProps {
  /** 모달 제목 */
  title: ReactNode;
  /** 제목 아래 부가 설명 (선택) */
  subtitle?: ReactNode;
  /** 본문 내용 */
  children: ReactNode;
  /** 하단 영역 (예: 닫기 버튼). 없으면 표시 안 함 */
  footer?: ReactNode;
  /** 닫기 콜백 */
  onClose: () => void;
  /** 너비: md = max-w-2xl, lg = max-w-4xl (기본 md) */
  size?: 'md' | 'lg';
  /** 본문에 최대 높이 + 스크롤 적용 (긴 내용용) */
  scrollable?: boolean;
}

/**
 * 예약 상세 / 대화 내역 등 공통 모달 레이아웃.
 * UI 변경 시 이 컴포넌트만 수정하면 모든 모달에 동일 적용.
 */
export default function AppModal({
  title,
  subtitle,
  children,
  footer,
  onClose,
  size = 'md',
  scrollable = false,
}: AppModalProps) {
  const maxWidthClass = size === 'lg' ? 'max-w-4xl' : 'max-w-2xl';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div
        className={`relative top-20 mx-auto p-5 border w-full ${maxWidthClass} shadow-lg rounded-md bg-white`}
      >
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              {subtitle != null && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="닫기"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div
            className={scrollable ? 'max-h-[70vh] overflow-y-auto' : undefined}
          >
            {children}
          </div>

          {footer != null && (
            <div className="mt-6 flex justify-end">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
