"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

import {
  Calendar,
  Clock,
  MapPin,
  Camera,
  Shield,
  TrendingUp,
  Target,
  Award,
  RefreshCw,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

import DashboardSkeleton from "@/components/ui/DashboardSkeleton";
import ChartSkeleton from "@/components/ui/ChartSkeleton";

import { Navbar } from "./Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useAttendance } from "@/hooks/useAttendance";
import { useCurriculum } from "@/hooks/useCurriculum";

import AchievementSection from "./AchievementSection";
import AttendanceChart from "./AttendanceChart";

import { weeklySchedule } from "@/constants/mockData";

import AttendanceAnalytics from "./dashboard/AttendanceAnalytics";
import StreakCounter from "./gamification/StreakCounter";
import XpProgressBar from "./gamification/XpProgressBar";
import BadgeGallery from "./gamification/BadgeGallery";

import ComplaintForm from "@/components/ComplaintForm";
import StreakTracker from "@/components/ui/StreakTracker";

const AttendanceHeatmap = dynamic(
  () => import("./AttendanceHeatmap"),
  {
    ssr: false,
    loading: () => <ChartSkeleton variant="heatmap" />,
  }
);

const AttendanceCalendar = dynamic(
  () => import("./AttendanceCalendar"),
  {
    ssr: false,
    loading: () => <ChartSkeleton variant="heatmap" />,
  }
);

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const ATTENDANCE_WINDOW_START_HOUR = 9;
const ATTENDANCE_WINDOW_END_MINUTE = 10;

const getUserInitials = (user) => {
  if (!user?.displayName && !user?.email) {
    return "U";
  }

  return (
    user?.displayName
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"
  );
};

const getDayName = (dayIndex) => DAY_NAMES[dayIndex] || DAY_NAMES[0];

const isWeekday = (dayIndex) => dayIndex >= 1 && dayIndex <= 5;

const parseClassStartTime = (time = "") => {
  const [startTime = "00:00"] = String(time).split("-");
  const [hour = "0", minute = "0"] = startTime.split(":");

  return {
    hour: Number(hour),
    minute: Number(minute),
  };
};

const getUpcomingClass = (classes, now) => {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    classes.find((cls) => {
      const startTime = parseClassStartTime(cls?.time);
      const classStartMinutes = startTime.hour * 60 + startTime.minute;

      return classStartMinutes > currentMinutes;
    }) || null
  );
};

const getTodaySchedule = (now, schedule = weeklySchedule) => {
  const dayIndex = now.getDay();
  const dayName = getDayName(dayIndex);
  const classes = schedule[dayName] || [];

  return {
    dayName,
    classes,
    upcomingClass: getUpcomingClass(classes, now),
    isAttendanceWindow:
      isWeekday(dayIndex) &&
      now.getHours() === ATTENDANCE_WINDOW_START_HOUR &&
      now.getMinutes() <= ATTENDANCE_WINDOW_END_MINUTE,
  };
};

const getScheduleTickKey = (now) =>
  `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;

const DashboardError = ({ error, onRetry }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="text-center max-w-sm">
      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>

      <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>

      <p className="text-muted-foreground text-sm mb-6">{error}</p>

      <button
        onClick={onRetry}
        className="w-full bg-gradient-to-r from-green-500 to-blue-500 py-3 rounded-xl font-bold text-white"
      >
        <RefreshCw className="w-4 h-4 mr-2 inline" />
        Retry
      </button>
    </div>
  </div>
);

const DashboardHeader = ({ user, currentTime, getInitials }) => (
  <div className="bg-card/40 backdrop-blur-xl rounded-2xl border border-border p-4 sm:p-6 shadow-xl">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          {user?.photoURL ? (
            <Image
              src={user.photoURL}
              alt="Profile"
              width={48}
              height={48}
              className="w-12 h-12 rounded-xl object-cover border border-accent/30"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{getInitials(user)}</span>
            </div>
          )}

          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-background" />
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold">
              {user?.displayName || user?.email?.split("@")[0] || "Student"}
            </h1>

            <StreakTracker />
          </div>

          <div className="text-sm text-muted-foreground">{user?.email || "No email"}</div>
        </div>
      </div>

      <div className="text-left md:text-right">
        <div className="text-lg sm:text-xl font-mono">
          {currentTime?.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        <div className="text-xs text-muted-foreground">
          {currentTime?.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>
    </div>
  </div>
);

const StudentDashboard = () => {
  const { user } = useAuth();

  const { recentActivity, gamificationData } = useAttendance({ role: "student", user });
  const { curriculum } = useCurriculum({ role: "student", user });

  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scheduleTime, setScheduleTime] = useState(new Date());
  const [error, setError] = useState(null);

  const [viewMode, setViewMode] = useState("heatmap");
  const [showComplaint, setShowComplaint] = useState(false);
  const lastScheduleTickRef = useRef(getScheduleTickKey(new Date()));

  const attendanceStats = useMemo(() => {
    const counts = recentActivity.reduce(
      (acc, curr) => {
        const status = curr?.status?.toLowerCase();

        if (status === "present") acc.present++;
        else if (status === "absent") acc.absent++;
        else if (status === "late") acc.late++;

        return acc;
      },
      {
        present: 0,
        absent: 0,
        late: 0,
      }
    );

    const total =
      counts.present +
      counts.absent +
      counts.late;

    const percentage =
      total > 0
        ? Math.round(
            ((counts.present + counts.late) /
              total) *
              100
          )
        : 0;

    return {
      ...counts,
      total,
      percentage,
    };
  }, [recentActivity]);

  const attendancePerformance = useMemo(() => {
    return {
      attendancePercentage:
        attendanceStats?.percentage ?? 0,
      streakDays:
        gamificationData?.currentStreak ?? 0,
    };
  }, [attendanceStats, gamificationData]);

  const scheduleState = useMemo(
    () => getTodaySchedule(scheduleTime, weeklySchedule),
    [scheduleTime]
  );

  const todayClasses = scheduleState.classes;
  const upcomingClass = scheduleState.upcomingClass;
  const isAttendanceWindow = scheduleState.isAttendanceWindow;

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    const updateDashboard = () => {
      const now = new Date();

      setCurrentTime(now);

      const scheduleTickKey = getScheduleTickKey(now);
      if (lastScheduleTickRef.current !== scheduleTickKey) {
        lastScheduleTickRef.current = scheduleTickKey;
        setScheduleTime(now);
      }

      setError(null);
    };

    updateDashboard();

    const timer = setInterval(
      updateDashboard,
      1000
    );

    return () => {
      clearInterval(timer);
      clearTimeout(loadingTimer);
    };
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <DashboardError error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <Navbar />

      <div className="relative z-10 max-w-7xl mx-auto pt-20 pb-12 px-4 sm:px-6 space-y-6">
        <DashboardHeader
          user={user}
          currentTime={currentTime}
          getInitials={getUserInitials}
        />

        {/* Remaining UI same structure */}

      </div>
    </div>
  );
};

const StatCard = ({ color, label, value }) => {
  const styles = {
    green:
      "from-green-500/20 to-green-600/20 border-green-500/30 text-green-400",
    red:
      "from-red-500/20 to-red-600/20 border-red-500/30 text-red-400",
    yellow:
      "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-400",
    blue:
      "from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400",
  };

  return (
    <div
      className={`bg-gradient-to-r ${styles[color]} border rounded-xl p-3 sm:p-4`}
    >
      <div className="text-[10px] sm:text-sm opacity-80">
        {label}
      </div>

      <div className="text-base sm:text-xl font-bold">
        {value}
      </div>
    </div>
  );
};

export default StudentDashboard;