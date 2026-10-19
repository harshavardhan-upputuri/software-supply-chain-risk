import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardHeader, CardContent } from "../../../components/common/Card";

export function EcosystemChart({ data = [] }) {
  const COLORS = {
    Maven: "#f59e0b",
    PyPI: "#0ea5e9",
  };

  return (
    <Card>
      <CardHeader
        title="Ecosystem Distribution"
        subtitle="Active projects partitioned by package manager ecosystem"
      />
      <CardContent className="h-64 pt-2">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No ecosystem distribution data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <XAxis type="number" allowDecimals={false} stroke="#94a3b8" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={60} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "0.75rem",
                  borderColor: "#e2e8f0",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={26}>
                {data.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name] || "#3b82f6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default EcosystemChart;
