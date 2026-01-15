
const NOTIFICATION_KEY_ENABLED = 'smart_brush_notify_enabled';
const NOTIFICATION_KEY_LAST_DATE = 'smart_brush_last_notify_date';

const MOTIVATIONAL_MESSAGES = [
  "学习如逆水行舟，不进则退。今天也要加油哦！💪",
  "积少成多，每天几道题，考试没问题！📚",
  "别让今天的懒惰成为明天的遗憾，快来刷题吧！✨",
  "保持手感很重要，利用碎片时间做几道题吧~ ⏱️",
  "你距离上岸只差今天的练习了！🎯",
  "温故而知新，去复习一下错题本吧？📖",
  "种一棵树最好的时间是十年前，其次是现在。🌱"
];

export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

export const isNotificationEnabled = (): boolean => {
  return localStorage.getItem(NOTIFICATION_KEY_ENABLED) === 'true' && Notification.permission === 'granted';
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) {
    alert('您的浏览器或当前环境不支持通知功能。');
    return false;
  }

  // Handle "Denied" state explicitly
  if (Notification.permission === 'denied') {
      // Use confirm to allow user to decide if they want to know how to fix it
      const wantHelp = window.confirm(
          '通知权限已被系统或浏览器拒绝。\n\n需要手动开启才能接收提醒。是否查看开启方法？'
      );
      if (wantHelp) {
          alert('请尝试以下步骤：\n1. 点击浏览器地址栏左侧的“锁”图标或“设置”图标。\n2. 找到“权限”或“通知”。\n3. 将其设置为“允许”或“重置”。\n4. 刷新页面重试。');
      }
      return false;
  }

  try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem(NOTIFICATION_KEY_ENABLED, 'true');
        new Notification('小墨鱼刷题', {
          body: '提醒已开启！每天我会温馨提醒您一次。',
          icon: 'https://cdn-icons-png.flaticon.com/512/10609/10609009.png'
        });
        return true;
      } else {
        // User clicked Block
        localStorage.setItem(NOTIFICATION_KEY_ENABLED, 'false');
        if (permission === 'denied') {
            alert('您拒绝了通知权限。如果想再次开启，需要在浏览器设置中手动允许。');
        }
        return false;
      }
  } catch (e) {
      console.error("Permission request error", e);
      alert("申请权限时发生错误，请检查浏览器设置。");
      return false;
  }
};

export const disableNotification = () => {
  localStorage.setItem(NOTIFICATION_KEY_ENABLED, 'false');
};

export const checkAndSendDailyNotification = () => {
  if (!isNotificationSupported() || !isNotificationEnabled()) {
    return;
  }

  const lastDate = localStorage.getItem(NOTIFICATION_KEY_LAST_DATE);
  const today = new Date().toDateString();

  if (lastDate === today) {
    return;
  }

  const randomMsg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
  
  try {
    const notification = new Notification('该刷题啦 👋', {
      body: randomMsg,
      icon: 'https://cdn-icons-png.flaticon.com/512/10609/10609009.png',
      tag: 'daily-reminder'
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    localStorage.setItem(NOTIFICATION_KEY_LAST_DATE, today);
  } catch (e) {
    console.error("Notification failed", e);
  }
};
