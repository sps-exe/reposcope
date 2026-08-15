import merge from 'deepmerge';
import { DateTime } from 'luxon';
import _ from 'lodash';
import format from 'human-format';

import type { XAXisOption, YAXisOption } from 'echarts/types/dist/shared';

// Local shims for echarts internal types — the deep type paths
// (echarts/types/src/...) were removed in echarts 5.6.
type OptionId = string | number;

type AxisBaseOption = {
  splitLine?: any;
  axisLine?: any;
  axisPointer?: any;
  axisLabel?: any;
  nameTextStyle?: any;
  min?: any;
  max?: any;
  minInterval?: number;
  splitNumber?: number;
  position?: any;
};

type TimeAxisBaseOption = AxisBaseOption;
type ValueAxisBaseOption = AxisBaseOption;
type CategoryAxisBaseOption = AxisBaseOption;
type LogAxisBaseOption = AxisBaseOption;

type AxisOption<
  T extends 'x' | 'y',
  Base extends AxisBaseOption = AxisBaseOption
> = (T extends 'x' ? XAXisOption : YAXisOption) & Base;

function filterEnum<T extends string>(value: string | undefined, enums: readonly T[]): T | undefined {
  return (enums as readonly string[]).includes(value ?? '') ? value as T : undefined;
}

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const formatMonth = (value: number | string | Date) => {
  const date = new Date(value);
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

const now = new Date();

const defaultSplitLine = { show: true, lineStyle: { color: '#2a2a2c', type: 'dashed' as const } };
const defaultAxisLine = { lineStyle: { color: '#2a2a2c' } };

export function timeAxis<T extends 'x' | 'y'>(
  id?: OptionId,
  option: AxisOption<T, TimeAxisBaseOption> = {},
  fromRecent: string | boolean | undefined = 'event_month',
  data?: any[] // ! Different from the original
): AxisOption<T> {
  return merge<AxisOption<T, TimeAxisBaseOption>>(option, {
    id,
    type: 'time',
    splitLine: defaultSplitLine,
    axisLine: defaultAxisLine,
    axisPointer: {
      label: {
        formatter: ({ value }: { value: number | string | Date }) => {
          return formatMonth(value);
        },
      },
    },
    min: !_.isEmpty(fromRecent)
      ? fromRecent === true
        ? undefined
        : (() => {
            if (!fromRecent || !data) return undefined;
            const flat = _.flatten(data).filter(Boolean);
            const min = _.minBy(flat, (i) => i[fromRecent]);
            if (!min?.[fromRecent]) return undefined;
            return DateTime.fromISO(min[fromRecent]).minus({ month: 1 }).toJSDate();
          })()
      : undefined,
    max: DateTime.fromJSDate(
      new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    )
      .plus({ month: 1 })
      .toJSDate(),
    minInterval: 3600 * 24 * 1000 * 28,
  });
}

export function valueAxis<T extends 'x' | 'y'>(
  id?: OptionId,
  option: AxisOption<T, ValueAxisBaseOption> = {}
): AxisOption<T> {
  const small = false; // ! Different from the original
  return merge<AxisOption<T>>(option, {
    id,
    type: 'value',
    splitLine: defaultSplitLine,
    axisLine: defaultAxisLine,
    axisLabel: {
      formatter: (value: number) => format(value),
      margin: 8,
    },
    splitNumber: small ? 3 : 5,
    axisPointer: {
      label: {
        precision: 0,
      },
    },
    nameTextStyle: {
      opacity: small ? 0 : 1,
      align: filterEnum(option.position ?? 'left', ['left', 'right'] as const),
    },
  });
}

export function categoryAxis<T extends 'x' | 'y'>(
  id?: OptionId,
  option: AxisOption<T, CategoryAxisBaseOption> = {}
): AxisOption<T> {
  return merge<AxisOption<T>>(option, {
    id,
    type: 'category',
    splitLine: defaultSplitLine,
    axisLine: defaultAxisLine,
    nameTextStyle: {
      align: filterEnum(option.position ?? 'left', ['left', 'right'] as const),
    },
  });
}

export function logAxis<T extends 'x' | 'y'>(
  id?: OptionId,
  option: AxisOption<T, LogAxisBaseOption> = {}
): AxisOption<T> {
  return merge<AxisOption<T>>(option, {
    id,
    type: 'log',
    nameTextStyle: {
      // opacity: small ? 0 : 1,
      opacity: 1,
      align: filterEnum(option.position ?? 'left', ['left', 'right'] as const),
    },
    // splitNumber: small ? 3 : undefined as any,
    axisLabel: {
      margin: 8,
    },
  });
}

export function recentStatsChartXAxis<T extends 'x'>(
  id?: OptionId,
  option: AxisOption<T, ValueAxisBaseOption> = {}
): AxisOption<T> {
  return merge<AxisOption<T>>(option, {
    type: 'category',
    inverse: true,
    axisLine: {
      show: false,
    },
    axisLabel: {
      show: false
    },
    axisTick: {
      show: false,
    },
    splitLine: {
      show: true,
      lineStyle: {
        type: 'solid' as const,
        // width: 4,
      },
      interval: 'auto' as const,
    },
  });
}