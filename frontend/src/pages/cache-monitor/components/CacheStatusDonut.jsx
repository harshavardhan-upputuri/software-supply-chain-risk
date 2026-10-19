import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardContent } from "../../../components/common/Card";

export function CacheStatusDonut({ stats }) {
  const data = [
    { name: "Complete", value: stats?.complete_count || 0, color: "#10b981" },
    { name: "Empty", value: stats?.empty_count || 0, color: "#94a3b8" },
    { name: "Failed", value: stats?.failed_count || 0, color: "#ef4444" },
  ];

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card>
      <CardHeader
        title="Cache Completeness Ratio"
        subtitle="Distribution of package resolution outcomes in local database cache"
      />
      <CardContent className="h-72 pt-2 relative">
        {total === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No cached packages recorded
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry) => (
                  <Cell key={`donut-cell-${entry.name}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "0.75rem",
                  borderColor: "#e2e8f0",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  fontSize: "12px",
                }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default CacheStatusDonut;
