self.addEventListener("push", (event) => {
  console.log("CAREQUEUE: Push event received!");

  let data = {};

  try {
    if (event.data) {
      const rawData = event.data.text();
      console.log("CAREQUEUE: Raw push payload:", rawData);

      try {
        data = JSON.parse(rawData);
      } catch {
        data = {
          title: "CareQueue",
          body: rawData || "You have a queue update.",
        };
      }
    }
  } catch (error) {
    console.error("CAREQUEUE: Payload reading failed:", error);
  }

  const title = data.title || "CareQueue";

  const options = {
    body: data.body || "You have a new queue update.",
    icon: "/carequeue-icon.svg",
    badge: "/carequeue-icon.svg",
    tag: data.tag || "carequeue-update",
    renotify: true,
    data: {
      url: data.url || "/patient-dashboard",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log("CAREQUEUE: Notification displayed successfully.");
      })
      .catch((error) => {
        console.error("CAREQUEUE: Notification display failed:", error);
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target =
    event.notification.data?.url || "/patient-dashboard";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientsList) {
        if ("focus" in client) {
          await client.navigate(target);
          return client.focus();
        }
      }

      return self.clients.openWindow(target);
    })()
  );
});