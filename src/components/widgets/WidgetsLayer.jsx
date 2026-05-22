import React, { useEffect } from 'react';
import { useWidgetStore } from '../../store/useWidgetStore';
import { WidgetContainer } from './WidgetContainer';
import { ClockWidget } from './ClockWidget';
import { TaskWidget } from './TaskWidget';
import { MusicWidget } from './MusicWidget';

const WIDGET_MAP = {
  clock: ClockWidget,
  tasks: TaskWidget,
  music: MusicWidget,
};

export const WidgetsLayer = () => {
  const { activeWidgets, loadWidgets } = useWidgetStore();

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  return (
    <div className="widgets-layer">
      {activeWidgets.map((widget) => {
        const WidgetComponent = WIDGET_MAP[widget.type];
        if (!WidgetComponent) return null;
        return (
          <WidgetContainer key={widget.id} widget={widget}>
            <WidgetComponent />
          </WidgetContainer>
        );
      })}
    </div>
  );
};
