/* eslint-disable react/prop-types */
import cx from "classnames";
import { useState } from "react";
import { t } from "ttag";
import _ from "underscore";

import { AdminContentTable } from "metabase/common/components/AdminContentTable";
import CS from "metabase/css/core/index.css";
import { FormSwitch } from "metabase/forms";
import { isDefaultGroup } from "metabase/lib/groups";
import { Icon, Tooltip } from "metabase/ui";

import AddMappingRow from "./AddMappingRow";
import {
  GroupMappingsWidgetAbout as About,
  GroupMappingsWidgetAboutContentRoot as AboutContentRoot,
  AddMappingButton,
  GroupMappingsWidgetHeader as Header,
  GroupMappingsWidgetRoot as Root,
  GroupMappingsWidgetToggleRoot as ToggleRoot,
  GroupMappingsWidgetAndErrorRoot as WidgetAndErrorRoot,
} from "./GroupMappingsWidget.styled";
import { MappingRow } from "./MappingRow";
import { SettingToggle } from "./SettingToggle";

const groupIsMappable = (group) => !isDefaultGroup(group);

export function GroupMappingsWidgetView({
  groupHeading,
  groupPlaceholder,
  allGroups = [],
  mappingSetting,
  deleteGroup,
  clearGroupMember,
  updateSetting,
  mappings,
  isFormik,
  ...props
}) {
  const [showAddRow, setShowAddRow] = useState(false);
  const [saveError, setSaveError] = useState({});

  const groups = allGroups.filter(groupIsMappable);

  const handleShowAddRow = () => {
    setShowAddRow(true);
  };

  const handleHideAddRow = () => {
    setShowAddRow(false);
  };

  const handleAddMapping = async (name) => {
    const mappingsPlusNewMapping = { ...mappings, [name]: [] };

    try {
      await updateSetting({
        key: mappingSetting,
        value: mappingsPlusNewMapping,
      });
      setShowAddRow(false);
      setSaveError(null);
    } catch (error) {
      setSaveError(error);
    }
  };

  const handleChangeMapping = (name) => async (group, selected) => {
    const updatedMappings = selected
      ? { ...mappings, [name]: [...mappings[name], group.id] }
      : {
          ...mappings,
          [name]: mappings[name].filter((id) => id !== group.id),
        };

    try {
      await updateSetting({ key: mappingSetting, value: updatedMappings });
      setSaveError(null);
    } catch (error) {
      setSaveError(error);
    }
  };

  const handleDeleteMapping = async ({
    name,
    onSuccess,
    groupIdsToDelete = [],
  }) => {
    const mappingsMinusDeletedMapping = _.omit(mappings, name);

    try {
      await updateSetting({
        key: mappingSetting,
        value: mappingsMinusDeletedMapping,
      });

      onSuccess && (await onSuccess());
      setSaveError(null);
    } catch (error) {
      setSaveError(error);
    }
  };

  return (
    <WidgetAndErrorRoot>
      <Root>
        <Header>
          <ToggleRoot>
            <span>{t`Synchronize Group Memberships`}</span>
            {isFormik ? ( // temporary until SettingsJWTForm and SettingsLdapForm are migrated to formik
              <FormSwitch
                data-testid="group-sync-switch"
                name={props.setting.key}
              />
            ) : (
              <SettingToggle {...props} hideLabel />
            )}
          </ToggleRoot>
          <About>
            <Tooltip
              label={t`Mappings allow Metabase to automatically add and remove users from groups based on the membership information provided by the directory server. If a group isn‘t mapped, its membership won‘t be synced.`}
              position="top"
              maw="20rem"
            >
              <AboutContentRoot>
                <Icon name="info" />
                <span>{t`About mappings`}</span>
              </AboutContentRoot>
            </Tooltip>
          </About>
        </Header>

        <div>
          <div>
            {!showAddRow && (
              <AddMappingButton primary small onClick={handleShowAddRow}>
                {t`New mapping`}
              </AddMappingButton>
            )}
            <AdminContentTable columnTitles={[groupHeading, t`Groups`, ""]}>
              {showAddRow && (
                <AddMappingRow
                  mappings={mappings}
                  placeholder={groupPlaceholder}
                  onCancel={handleHideAddRow}
                  onAdd={handleAddMapping}
                />
              )}
              {Object.keys(mappings).length === 0 && !showAddRow && (
                <tr>
                  <td>&nbsp;</td>
                  <td> {t`No mappings yet`}</td>
                  <td>&nbsp;</td>
                </tr>
              )}
              {Object.entries(mappings).map(([name, selectedGroupIds]) => {
                return groups?.length > 0 ? (
                  <MappingRow
                    key={name}
                    name={name}
                    groups={groups}
                    selectedGroupIds={selectedGroupIds}
                    clearGroupMember={clearGroupMember}
                    deleteGroup={deleteGroup}
                    onChange={handleChangeMapping(name)}
                    onDeleteMapping={handleDeleteMapping}
                  />
                ) : null;
              })}
            </AdminContentTable>
          </div>
        </div>
      </Root>
      {saveError?.data?.message && (
        <div className={cx(CS.textError, CS.textBold, CS.m1)}>
          {saveError.data.message}
        </div>
      )}
    </WidgetAndErrorRoot>
  );
}
