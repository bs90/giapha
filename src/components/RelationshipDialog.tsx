interface Props {
  onSelect: (relation: 'father' | 'mother' | 'spouse') => void;
  onCancel: () => void;
}

export default function RelationshipDialog({ onSelect, onCancel }: Props) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Chọn quan hệ</h3>
        <div className="dialog-buttons">
          <button className="btn-father" onClick={() => onSelect('father')}>
            👨 Bố
          </button>
          <button className="btn-mother" onClick={() => onSelect('mother')}>
            👩 Mẹ
          </button>
          <button className="btn-spouse" onClick={() => onSelect('spouse')}>
            💕 Kết hôn
          </button>
        </div>
        <button className="btn-cancel" onClick={onCancel}>
          Huỷ
        </button>
      </div>
    </div>
  );
}
