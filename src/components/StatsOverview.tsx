interface Props {
  totalPracticed: number;
  correctRate: number;
  todayCount: number;
  streak: number;
}

export default function StatsOverview({ totalPracticed, correctRate, todayCount, streak }: Props) {
  const items = [
    { label: "总刷题", value: totalPracticed, unit: "题" },
    { label: "正确率", value: correctRate, unit: "%" },
    { label: "今日", value: todayCount, unit: "题" },
    { label: "连续", value: streak, unit: "天" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="p-4 rounded-2xl bg-white shadow-sm text-center">
          <p className="text-2xl font-bold text-primary">
            {item.value}
            <span className="text-sm font-normal text-text-secondary ml-0.5">{item.unit}</span>
          </p>
          <p className="text-xs text-text-secondary mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
