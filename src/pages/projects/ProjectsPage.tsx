import React from 'react';
import { useHistory } from 'react-router-dom';
import { NetworkStatus } from '@apollo/client';
import { IconEdit, IconTrash, Text } from '@gpn-prototypes/vega-ui';

import { UpdateProject, UpdateProjectDiff } from '../../__generated__/types';
import { useBrowserTabActivity } from '../../hooks';
import { useNotifications } from '../../providers/notifications';
import { projectsMapper } from '../../utils/projects-mapper';

import {
  useDeleteProject,
  useProjectsTableList,
  useProjectToggleFavorite,
} from './__generated__/projects';
import { MenuItemProps, TableRow } from './ProjectsTable/types';
import { cnProjectsPage as cn } from './cn-projects-page';
import { ModalDeleteProject } from './ModalDeleteProject';
import { ProjectsPageView } from './ProjectsPageView';

interface UpdateProjectDiffResult extends UpdateProject {
  result: Required<UpdateProjectDiff>;
}

const testId = {
  projectRemove: 'ProjectsPage:button:remove',
  projectEdit: 'ProjectsPage:button:edit',
} as const;

const TABLE_POLLING_INTERVAL_MS = 1000 * 30;
const PAGE_SIZE = 20;

export const ProjectsPage = (): React.ReactElement => {
  const [isOpenModal, setIsOpenModal] = React.useState<boolean>(false);
  const [dataDeleteProject, setDataDeleteProject] = React.useState<TableRow | null>(null);
  const [nextPageNumber, setNextPageNumber] = React.useState<number>(2);

  const notifications = useNotifications();
  const history = useHistory();

  const {
    data,
    loading,
    startPolling,
    stopPolling,
    refetch,
    fetchMore,
    networkStatus,
  } = useProjectsTableList({
    fetchPolicy: 'network-only',
    pollInterval: TABLE_POLLING_INTERVAL_MS,
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
    variables: {
      pageNumber: 1,
      pageSize: PAGE_SIZE,
      includeBlank: false,
    },
  });

  const currentQuantityProjects =
    data?.projects?.__typename === 'ProjectList' &&
    data.projects.data &&
    data?.projects?.data.length > 0
      ? data?.projects?.data.length
      : undefined;

  const totalQuantityProjects =
    data?.projects?.__typename === 'ProjectList' && data.projects.itemsTotal
      ? data.projects.itemsTotal
      : undefined;

  const refetchProjects = () => {
    const pageSize = totalQuantityProjects
      ? totalQuantityProjects - (totalQuantityProjects - (nextPageNumber - 1) * PAGE_SIZE)
      : undefined;

    if (pageSize !== undefined) {
      refetch({ pageNumber: 1, pageSize });
    }
  };

  const [deleteProject] = useDeleteProject({
    onCompleted: () => {
      refetchProjects();
    },
  });

  useBrowserTabActivity({
    onActivated() {
      refetchProjects();
      startPolling(TABLE_POLLING_INTERVAL_MS);
    },
    onHidden() {
      stopPolling();
    },
  });

  const [toggleFavorite] = useProjectToggleFavorite();

  const handleToggleFavorite = React.useCallback(
    async (id: string, payload: { isFavorite: boolean; version: number }) => {
      const addToFavoriteResult = await toggleFavorite({
        context: {
          projectDiffResolving: {
            maxAttempts: 5,
            projectAccessor: {
              fromDiffError: (mutationData: UpdateProjectDiffResult) => ({
                local: { vid: id, isFavorite: !payload.isFavorite, version: payload.version },
                remote: mutationData.result.remoteProject,
              }),
            },
          },
        },
        variables: {
          vid: id,
          isFavorite: payload.isFavorite,
          version: payload.version,
        },
      });

      if (addToFavoriteResult.data?.updateProject?.result?.__typename === 'Error') {
        const addToFavoriteError = addToFavoriteResult.data?.updateProject?.result;

        notifications.add({
          key: `${addToFavoriteError.code}-add-to-favorite`,
          status: 'alert',
          message: addToFavoriteError.message,
          onClose(item) {
            notifications.remove(item.key);
          },
        });
      }
    },
    [notifications, toggleFavorite],
  );

  const isLoading = loading && !data?.projects;

  const mappedProjects = data?.projects?.__typename !== 'ProjectList' ? [] : projectsMapper(data);

  const projects = mappedProjects.map((project) => {
    const edit = ({ close, ...rest }: MenuItemProps) => {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            history.push(`/projects/show/${project.id}`);
            close();
          }}
          {...rest}
          data-testid={testId.projectEdit}
        >
          <span className={cn('MenuIcon')}>
            <IconEdit size="s" />
          </span>
          <Text as="span">Редактировать</Text>
        </button>
      );
    };

    const remove = ({ close, ...rest }: MenuItemProps) => {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDataDeleteProject(project);
            close();
            setIsOpenModal(true);
          }}
          {...rest}
          data-testid={testId.projectRemove}
        >
          <span className={cn('MenuIcon')}>
            <IconTrash size="s" />
          </span>
          <Text as="span">Удалить</Text>
        </button>
      );
    };

    return {
      ...project,
      menu: [
        { key: `${project.id}-edit`, Element: edit },
        { key: `${project.id}-remove`, Element: remove },
      ],
    };
  });

  const handleCloseModal = () => {
    setIsOpenModal(false);
  };

  const handleCancelDelete = () => {
    setIsOpenModal(false);
    setDataDeleteProject(null);
  };

  const handleDeleteProject = () => {
    /* istanbul ignore else */
    if (dataDeleteProject) {
      deleteProject({ variables: { vid: dataDeleteProject.id } }).then(() => {
        setIsOpenModal(false);
        notifications.add({
          autoClose: 3,
          key: `${dataDeleteProject.id}-system`,
          status: 'success',
          message: `Проект «${dataDeleteProject.name}» успешно удален.`,
          onClose(item) {
            notifications.remove(item.key);
          },
        });
        setDataDeleteProject(null);
      });
    }
  };

  return (
    <>
      <ProjectsPageView
        projects={projects}
        isLoading={isLoading}
        isLoadingMore={networkStatus === NetworkStatus.fetchMore}
        onFavorite={handleToggleFavorite}
        counterProjects={{ current: currentQuantityProjects, total: totalQuantityProjects }}
        onLoadMore={() => {
          fetchMore({
            variables: { pageNumber: nextPageNumber, pageSize: PAGE_SIZE },
            updateQuery: (prev, { fetchMoreResult }) => {
              if (!fetchMoreResult) return prev;

              const prevData =
                prev.projects?.__typename === 'ProjectList' && prev.projects.data
                  ? prev.projects.data
                  : [];
              const resultData =
                fetchMoreResult.projects?.__typename === 'ProjectList' &&
                fetchMoreResult.projects.data
                  ? fetchMoreResult.projects.data
                  : [];

              const prevItemsTotal =
                prev.projects?.__typename === 'ProjectList' ? prev.projects.itemsTotal : undefined;

              const resultItemsTotal =
                fetchMoreResult.projects?.__typename === 'ProjectList' &&
                fetchMoreResult.projects.itemsTotal
                  ? fetchMoreResult.projects.itemsTotal
                  : undefined;

              return {
                ...prev,
                ...fetchMoreResult,
                projects: {
                  data: [...prevData, ...resultData],
                  itemsTotal: resultItemsTotal ?? prevItemsTotal,
                  __typename: 'ProjectList',
                },
              };
            },
          }).then(() => {
            setNextPageNumber(nextPageNumber + 1);
          });
        }}
      />
      <ModalDeleteProject
        projectName={dataDeleteProject?.name}
        isOpen={isOpenModal}
        onClose={handleCloseModal}
        onCancelDelete={handleCancelDelete}
        onDeleteProject={handleDeleteProject}
      />
    </>
  );
};

ProjectsPage.testId = testId;
