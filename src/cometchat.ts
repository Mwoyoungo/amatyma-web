import { CometChat } from "@cometchat/chat-sdk-javascript";
import { CometChatUIKit, UIKitSettingsBuilder } from "@cometchat/chat-uikit-react";

const COMETCHAT_CONSTANTS = {
  APP_ID: "1678655d5116b4d9e",
  REGION: "us",
  AUTH_KEY: "645135588ebf9d6fa298be23f0fea0d49d97fb57",
};

export const initCometChat = async (): Promise<void> => {
  const UIKitSettings = new UIKitSettingsBuilder()
    .setAppId(COMETCHAT_CONSTANTS.APP_ID)
    .setRegion(COMETCHAT_CONSTANTS.REGION)
    .setAuthKey(COMETCHAT_CONSTANTS.AUTH_KEY)
    .subscribePresenceForAllUsers()
    .build();

  return CometChatUIKit.init(UIKitSettings)
    .then(() => {
      console.log("CometChat initialization completed successfully");
    })
    .catch((error) => {
      console.error("CometChat initialization failed:", error);
      throw error;
    });
};

export const loginToCometChat = async (uid: string): Promise<CometChat.User> => {
  // Synchronous check first (CometChatUIKitLoginListener caches the session)
  const { CometChatUIKitLoginListener } = await import("@cometchat/chat-uikit-react");
  const syncUser = CometChatUIKitLoginListener.getLoggedInUser();
  if (syncUser) {
    console.log("CometChat already logged in (sync):", syncUser.getName());
    return syncUser;
  }
  // Async check as secondary fallback
  const existing = await CometChatUIKit.getLoggedinUser().catch(() => null);
  if (existing) {
    console.log("CometChat already logged in (async):", existing.getName());
    return existing;
  }

  // Retry up to 3 times with increasing delays to handle the post-init race condition
  const delays = [1000, 2000, 3000];
  let lastError: unknown;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const user = await CometChatUIKit.login(uid);
      console.log("CometChat login successful:", user.getName());
      return user;
    } catch (error) {
      lastError = error;
      console.warn(`CometChat login attempt ${attempt + 1} failed:`, error);
      if (attempt < delays.length) {
        await new Promise((res) => setTimeout(res, delays[attempt]));
        // Check again — a previous attempt may have partially succeeded
        const retryCheck = await CometChatUIKit.getLoggedInUser().catch(() => null);
        if (retryCheck) return retryCheck;
      }
    }
  }

  console.error("CometChat login failed after retries:", lastError);
  throw lastError;
};

export const logoutFromCometChat = async (): Promise<void> => {
  return CometChat.logout()
    .then(() => {
      console.log("CometChat logout successful");
    })
    .catch((error) => {
      console.error("CometChat logout failed:", error);
      throw error;
    });
};
