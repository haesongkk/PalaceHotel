'use client';

import { useState, useEffect, useRef } from 'react';
import { Room, DayOfWeek } from '@/types';

interface RoomModalProps {
  room: Room | null;
  onClose: () => void;
}

const dayLabels: Record<DayOfWeek, string> = {
  monday: '월',
  tuesday: '화',
  wednesday: '수',
  thursday: '목',
  friday: '금',
  saturday: '토',
  sunday: '일',
};

const daysOfWeek: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const defaultPrices = {
  monday: { stayPrice: 100000, dayUsePrice: 50000 },
  tuesday: { stayPrice: 100000, dayUsePrice: 50000 },
  wednesday: { stayPrice: 100000, dayUsePrice: 50000 },
  thursday: { stayPrice: 100000, dayUsePrice: 50000 },
  friday: { stayPrice: 100000, dayUsePrice: 50000 },
  saturday: { stayPrice: 100000, dayUsePrice: 50000 },
  sunday: { stayPrice: 100000, dayUsePrice: 50000 },
};

export default function RoomModal({ room, onClose }: RoomModalProps) {
  const [formData, setFormData] = useState({
    imageUrl: '',
    type: '',
    prices: defaultPrices,
    dayUseCheckIn: '10:00',
    dayUseCheckOut: '18:00',
    stayCheckIn: '15:00',
    stayCheckOut: '11:00',
    description: '',
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (room) {
      setFormData({
        imageUrl: room.imageUrl || '',
        type: room.type,
        prices: room.prices,
        dayUseCheckIn: room.dayUseCheckIn,
        dayUseCheckOut: room.dayUseCheckOut,
        stayCheckIn: room.stayCheckIn,
        stayCheckOut: room.stayCheckOut,
        description: room.description || '',
      });
    } else {
      setFormData({
        imageUrl: '',
        type: '',
        prices: defaultPrices,
        dayUseCheckIn: '10:00',
        dayUseCheckOut: '18:00',
        stayCheckIn: '15:00',
        stayCheckOut: '11:00',
        description: '',
      });
    }
  }, [room]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, imageUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handlePriceChange = (day: DayOfWeek, field: 'stayPrice' | 'dayUsePrice', value: string) => {
    setFormData({
      ...formData,
      prices: {
        ...formData.prices,
        [day]: {
          ...formData.prices[day],
          [field]: parseInt(value) || 0,
        },
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      imageUrl: formData.imageUrl || undefined,
      type: formData.type,
      prices: formData.prices,
      dayUseCheckIn: formData.dayUseCheckIn,
      dayUseCheckOut: formData.dayUseCheckOut,
      stayCheckIn: formData.stayCheckIn,
      stayCheckOut: formData.stayCheckOut,
      description: formData.description || undefined,
    };

    try {
      const url = room ? `/api/rooms/${room.id}` : '/api/rooms';
      const method = room ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        onClose();
      } else {
        alert('저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save room:', error);
      alert('저장에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {room ? '객실 수정' : '객실 추가'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                대표 이미지
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                {formData.imageUrl ? (
                  <div className="space-y-3">
                    <img
                      src={formData.imageUrl}
                      alt="객실 이미지 미리보기"
                      className="w-full h-48 object-cover rounded-md border mx-auto"
                    />
                    <div className="flex justify-center space-x-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                      >
                        이미지 변경
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                      >
                        이미지 제거
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-600">
                        이미지를 드래그하여 놓거나
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        파일 선택
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                객실 타입
              </label>
              <input
                type="text"
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="예: 스탠다드, 디럭스, 스위트"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                입실/퇴실 시간
              </label>
              <div className="grid grid-cols-2 gap-4 border rounded-md p-4 bg-gray-50">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">대실</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">입실시간</label>
                      <input
                        type="time"
                        required
                        value={formData.dayUseCheckIn}
                        onChange={(e) => setFormData({ ...formData, dayUseCheckIn: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">퇴실시간</label>
                      <input
                        type="time"
                        required
                        value={formData.dayUseCheckOut}
                        onChange={(e) => setFormData({ ...formData, dayUseCheckOut: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">숙박</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">입실시간</label>
                      <input
                        type="time"
                        required
                        value={formData.stayCheckIn}
                        onChange={(e) => setFormData({ ...formData, stayCheckIn: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">퇴실시간</label>
                      <input
                        type="time"
                        required
                        value={formData.stayCheckOut}
                        onChange={(e) => setFormData({ ...formData, stayCheckOut: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                요일별 숙박 및 대실 가격
              </label>
              <div className="border rounded-md overflow-hidden bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        요일
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        숙박 가격
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        대실 가격
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {daysOfWeek.map((day) => (
                      <tr key={day} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {dayLabels[day]}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="number"
                            required
                            min="0"
                            value={formData.prices[day].stayPrice}
                            onChange={(e) => handlePriceChange(day, 'stayPrice', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="number"
                            required
                            min="0"
                            value={formData.prices[day].dayUsePrice}
                            onChange={(e) => handlePriceChange(day, 'dayUsePrice', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="객실에 대한 설명을 입력하세요"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
