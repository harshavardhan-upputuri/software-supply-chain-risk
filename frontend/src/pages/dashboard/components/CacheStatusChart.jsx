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

export function CacheStatusChart({ data = [] }) {
  const COLORS = {
    Complete: "#10b981",
    Empty: "#94a3b8",
    Failed: "#ef4444",
  };

  const hasData = data && data.some((d) => d.value > 0);

  return (
    <Card>
      <CardHeader
        title="Package Cache Health"
        subtitle="Resolution status of cached package dependency graphs"
      />
      <CardContent className="h-64 pt-2">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No package cache data recorded yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry) => (
                  <Cell
                    key={`pie-cell-${entry.name}`}
                    fill={COLORS[entry.name] || "#64748b"}
                  />
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
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default CacheStatusChart;
