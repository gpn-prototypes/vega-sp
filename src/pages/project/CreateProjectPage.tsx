import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Loader } from '@gpn-prototypes/vega-ui';

import { ProjectStatusEnum } from '../../__generated__/types';
import { useSnackbar } from '../../providers/snackbar';
import { FormValues, ProjectForm } from '../../ui/features/projects';

import { useCreateProject, useQueryRegionList, useUpdateProject2 } from './__generated__/project';
import { cnPage } from './cn-page';
import { ReferenceDataType } from './types';

import './ProjectPage.css';

const BLANK_PROJECT_ID = 'blank-project-id';

type PageProps = Record<string, unknown>;

export const CreateProjectPage: React.FC<PageProps> = () => {
  const history = useHistory();
  const snackbar = useSnackbar();

  const [blankProjectId, setBlankProjectId] = useState<string | undefined>(undefined);

  const [createProject, { error: createProjectError }] = useCreateProject();

  const [updateProject, { error: updateProjectError }] = useUpdateProject2();

  useEffect(() => {
    let isCancelled = false;

    const data = localStorage.getItem(BLANK_PROJECT_ID);

    const call = async () => {
      const createProjectResult = await createProject();

      if (createProjectResult.data?.createProject?.result?.__typename === 'Project') {
        const projectId = createProjectResult.data.createProject?.result?.vid || undefined;

        localStorage.setItem(BLANK_PROJECT_ID, String(projectId));

        if (!isCancelled) {
          setBlankProjectId(projectId);
        }
      }

      if (createProjectResult.data?.createProject?.result?.__typename === 'Error') {
        const inlineCreateProjectError = createProjectResult.data?.createProject?.result;

        snackbar.addItem({
          key: `${inlineCreateProjectError.code}-create-error`,
          status: 'alert',
          message: inlineCreateProjectError.message,
        });
      }
    };

    if (data) {
      setBlankProjectId(data);
    } else {
      call();
    }

    return () => {
      isCancelled = true;
    };
  }, [createProject, snackbar]);

  const {
    data: queryRegionListData,
    loading: queryRegionListLoading,
    error: queryRegionListError,
  } = useQueryRegionList();

  const referenceData: ReferenceDataType = { regionList: queryRegionListData?.regionList };

  const handleFormSubmit = async (values: FormValues) => {
    const updateProjectResult = await updateProject({
      variables: {
        vid: blankProjectId,
        name: values.description.name?.trim(),
        type: values.description.type,
        region:
          values.description.region && values.description.region !== 'NOT_SELECTED'
            ? values.description.region
            : undefined,
        coordinates: values.description.coordinates?.trim() || undefined,
        description: values.description.description?.trim() || undefined,
        yearStart: values.description.yearStart,
        status: ProjectStatusEnum.Unpublished,
        version: 1,
      },
    });

    if (updateProjectResult.data?.updateProject?.result?.__typename === 'Project') {
      const projectId = updateProjectResult.data.updateProject?.result?.vid || undefined;

      localStorage.removeItem(BLANK_PROJECT_ID);

      history.push(`/projects/show/${projectId}`);
    }

    if (updateProjectResult.data?.updateProject?.result?.__typename === 'Error') {
      const inlineUpdateProjectError = updateProjectResult.data?.updateProject?.result;

      snackbar.addItem({
        key: `${inlineUpdateProjectError.code}-update-error`,
        status: 'alert',
        message: inlineUpdateProjectError.message,
      });
    }
  };

  if (createProjectError || updateProjectError || queryRegionListError) {
    // eslint-disable-next-line no-console
    console.log({ createProjectError, updateProjectError, queryRegionListError });

    return null;
  }

  if (!blankProjectId || queryRegionListLoading) {
    return <Loader />;
  }

  return (
    <div className={cnPage()}>
      <ProjectForm mode="create" referenceData={referenceData} onSubmit={handleFormSubmit} />
    </div>
  );
};
