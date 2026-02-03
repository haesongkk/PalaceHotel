'use client';

import { Reservation, Room } from '@/types';
import ConversationPanel from '@/components/ConversationPanel';

interface ReservationConversationPanelProps {
  reservation: Reservation;
  rooms: Room[];
  onClose: () => void;
  onStatusChange: () => void;
}

export default function ReservationConversationPanel({
  reservation,
  rooms,
  onClose,
  onStatusChange,
}: ReservationConversationPanelProps) {
  return (
    <ConversationPanel
      source={{ mode: 'reservation', reservation }}
      rooms={rooms}
      onClose={onClose}
      onStatusChange={onStatusChange}
    />
  );
}
