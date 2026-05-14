import React, { useContext, useEffect, useState } from 'react';
import '../../styles/CometChatCreateGroup/CometChatCreateGroup.css';
import { CometChat } from '@cometchat/chat-sdk-javascript';
import { AppContext } from '../../context/AppContext';
import { CometChatGroupEvents, getLocalizedString } from '@cometchat/chat-uikit-react';

interface CreateGroupProps {
  setShowCreateGroup: React.Dispatch<React.SetStateAction<boolean>>;
  onGroupCreated?: (group: CometChat.Group) => void;
}

const CometChatCreateGroup = ({ setShowCreateGroup, onGroupCreated = () => {} }: CreateGroupProps) => {
  const [groupType, setGroupType] = useState<string>(CometChat.GROUP_TYPE.PUBLIC);
  const [groupName, setGroupName] = useState('');
  const [isGroupCreated, setIsGroupCreated] = useState(false);
  const [groupPassword, setGroupPassword] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { setAppState } = useContext(AppContext);

  useEffect(() => {
    // Detect dark mode from parent element
    const checkDarkMode = () => {
      const hasDarkTheme = document.querySelector('[data-theme="dark"]') !== null;
      setIsDarkMode(hasDarkTheme);
    };
    checkDarkMode();
    // Re-check on mutation
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, { attributes: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const getGroupTypeConstant = (type: string): string => {
    switch (type) {
      case 'public':
        return CometChat.GROUP_TYPE.PUBLIC;
      case 'private':
        return CometChat.GROUP_TYPE.PRIVATE;
      case 'password':
        return CometChat.GROUP_TYPE.PASSWORD;
      default:
        return CometChat.GROUP_TYPE.PUBLIC;
    }
  };

  async function handleSubmit() {
    if (!isGroupCreated) {
      setIsGroupCreated(true);
      const GUID = `group_${new Date().getTime()}`;
      const groupTypeConstant = getGroupTypeConstant(groupType);
      const group = new CometChat.Group(GUID, groupName, groupTypeConstant, groupPassword);
      try {
        const createdGroup = await CometChat.createGroup(group);
        // Ensure we have a proper Group instance
        if (createdGroup && typeof createdGroup.getGuid === 'function') {
          CometChatGroupEvents.ccGroupCreated.next(createdGroup);
          onGroupCreated(createdGroup);
          setAppState({ type: 'updateSelectedItemGroup', payload: createdGroup });
          setAppState({ type: 'updateSideComponent', payload: { visible: false, type: '' } });
          setShowCreateGroup(false);
        } else {
          // If createGroup returns plain object, fetch the actual group
          const fetchedGroup = await CometChat.getGroup(GUID);
          CometChatGroupEvents.ccGroupCreated.next(fetchedGroup);
          onGroupCreated(fetchedGroup);
          setAppState({ type: 'updateSelectedItemGroup', payload: fetchedGroup });
          setAppState({ type: 'updateSideComponent', payload: { visible: false, type: '' } });
          setShowCreateGroup(false);
        }
      } catch (error) {
        console.error('Group creation failed with exception:', error);
        setIsGroupCreated(false);
      }
    }
  }

  return (
    <div className="cometchat-create-group__backdrop">
      <div className={`cometchat-create-group ${isDarkMode ? 'cometchat-create-group--dark' : ''}`}>
        <div className="cometchat-create-group__title">{getLocalizedString('new_group') || 'New Group'}</div>
        <div className="cometchat-create-group__content">
          <div className="cometchat-create-group__type-wrapper">
            <span className="cometchat-create-group__type-text">{getLocalizedString('type') || 'Type'}</span>
            <div className="cometchat-create-group__type-content">
              <div
                className={`cometchat-create-group__type ${groupType === 'public' ? 'cometchat-create-group__type-selected' : ''}`}
                onClick={() => setGroupType('public')}
              >
                {getLocalizedString('create_group_public') || 'Public'}
              </div>
              <div
                className={`cometchat-create-group__type ${groupType === 'private' ? 'cometchat-create-group__type-selected' : ''}`}
                onClick={() => setGroupType('private')}
              >
                {getLocalizedString('create_group_private') || 'Private'}
              </div>
              <div
                className={`cometchat-create-group__type ${groupType === 'password' ? 'cometchat-create-group__type-selected' : ''}`}
                onClick={() => setGroupType('password')}
              >
                {getLocalizedString('create_group_password') || 'Password'}
              </div>
            </div>
          </div>

          <div className="cometchat-create-group__name-wrapper">
            {getLocalizedString('name') || 'Name'}
            <input
              type="text"
              className="cometchat-create-group__input"
              placeholder={getLocalizedString('create_group_name_placeholder') || 'Enter the group name'}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
          </div>
          {groupType === 'password' && (
            <div className="cometchat-create-group__password-wrapper">
              {getLocalizedString('create_group_password')}
              <input
                type="password"
                className="cometchat-create-group__input"
                placeholder={getLocalizedString('create_group_password_placeholder')}
                value={groupPassword}
                onChange={(e) => setGroupPassword(e.target.value)}
                required
              />
            </div>
          )}
        </div>
        <button className="cometchat-create-group__submit-button" onClick={handleSubmit}>
          {getLocalizedString('create_group') || 'Create Group'}
        </button>
        <div className="cometchat-create-group__close-button" onClick={() => setShowCreateGroup(false)} />
      </div>
    </div>
  );
};

export default CometChatCreateGroup;
