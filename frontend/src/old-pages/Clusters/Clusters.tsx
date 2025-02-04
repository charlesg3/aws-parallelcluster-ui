// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
// with the License. A copy of the License is located at
//
// http://aws.amazon.com/apache2.0/
//
// or in the "LICENSE.txt" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
// OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and
// limitations under the License.
import {
  ClusterInfoSummary,
  ClusterName,
  ClusterStatus,
} from '../../types/clusters'
import React, {useEffect, useMemo} from 'react'
import {NavigateFunction, useNavigate, useParams} from 'react-router-dom'
import {DescribeCluster, GetConfiguration, ListClusters} from '../../model'
import {useState, clearState, setState} from '../../store'
import {selectCluster} from './util'
import {findFirst} from '../../util'
import {Trans, useTranslation} from 'react-i18next'

import {useQuery} from 'react-query'
import {
  Button,
  Header,
  Pagination,
  SpaceBetween,
  SplitPanel,
  Table,
  TextFilter,
} from '@cloudscape-design/components'
import {useCollection} from '@cloudscape-design/collection-hooks'

import EmptyState from '../../components/EmptyState'
import {ClusterStatusIndicator} from '../../components/Status'
import Actions from './Actions'
import Details from './Details'
import {wizardShow} from '../Configure/Configure'
import Layout from '../Layout'
import {useHelpPanel} from '../../components/help-panel/HelpPanel'
import TitleDescriptionHelpPanel from '../../components/help-panel/TitleDescriptionHelpPanel'
import InfoLink from '../../components/InfoLink'
import {extendCollectionsOptions} from '../../shared/extendCollectionsOptions'

export function onClustersUpdate(
  selectedClusterName: ClusterName,
  clusters: ClusterInfoSummary[],
  oldStatus: ClusterStatus,
  navigate: NavigateFunction,
): void {
  if (!selectedClusterName) {
    return
  }
  const selectedCluster = findFirst(
    clusters,
    c => c.clusterName === selectedClusterName,
  )
  if (selectedCluster) {
    if (oldStatus !== selectedCluster.clusterStatus) {
      setState(
        ['app', 'clusters', 'selectedStatus'],
        selectedCluster.clusterStatus,
      )
    }
    if (oldStatus === 'DELETE_IN_PROGRESS') {
      clearState(['app', 'clusters', 'selected'])
      navigate('/clusters')
    }
  }
}

function ClusterList({clusters}: {clusters: ClusterInfoSummary[]}) {
  const selectedClusterName = useState(['app', 'clusters', 'selected'])
  let navigate = useNavigate()
  let params = useParams()
  const {t} = useTranslation()

  React.useEffect(() => {
    if (params.clusterName && selectedClusterName !== params.clusterName)
      selectCluster(params.clusterName, DescribeCluster, GetConfiguration)
  }, [navigate, params.clusterName, selectedClusterName])

  const onSelectionChangeCallback = React.useCallback(
    ({detail}) => {
      navigate(`/clusters/${detail.selectedItems[0].clusterName}`)
    },
    [navigate],
  )

  const configure = () => {
    wizardShow(navigate)
  }

  const clustersCount = (clusters || []).length

  const {
    items,
    actions,
    filteredItemsCount,
    collectionProps,
    filterProps,
    paginationProps,
  } = useCollection(
    clusters || [],
    extendCollectionsOptions({
      filtering: {
        empty: (
          <EmptyState
            title={t('cluster.list.filtering.empty.title')}
            subtitle={t('cluster.list.filtering.empty.subtitle')}
            action={
              <Button onClick={configure}>
                {t('cluster.list.filtering.empty.action')}
              </Button>
            }
          />
        ),
        noMatch: (
          <EmptyState
            title={t('cluster.list.filtering.noMatch.title')}
            subtitle={t('cluster.list.filtering.noMatch.subtitle')}
            action={
              <Button onClick={() => actions.setFiltering('')}>
                {t('cluster.list.filtering.noMatch.action')}
              </Button>
            }
          />
        ),
      },
      sorting: {},
      selection: {},
    }),
  )

  return (
    <Table
      {...collectionProps}
      variant="full-page"
      stickyHeader
      header={
        <Header
          variant="awsui-h1-sticky"
          description={t('cluster.list.header.description')}
          counter={`(${clustersCount})`}
          info={<InfoLink helpPanel={<ClustersHelpPanel />} />}
          actions={<Actions />}
        >
          {t('cluster.list.header.title')}
        </Header>
      }
      trackBy="clusterName"
      columnDefinitions={[
        {
          id: 'name',
          header: t('cluster.list.cols.name'),
          cell: cluster => cluster.clusterName,
          sortingField: 'clusterName',
        },
        {
          id: 'status',
          header: t('cluster.list.cols.status'),
          cell: cluster => <ClusterStatusIndicator cluster={cluster} /> || '-',
          sortingField: 'clusterStatus',
        },
        {
          id: 'version',
          header: t('cluster.list.cols.version'),
          cell: cluster => cluster.version || '-',
        },
      ]}
      loading={!clusters}
      items={items}
      selectionType="single"
      loadingText={t('cluster.list.loadingText')}
      pagination={<Pagination {...paginationProps} />}
      filter={
        <TextFilter
          {...filterProps}
          countText={`${t('cluster.list.countText')} ${filteredItemsCount}`}
          filteringAriaLabel={t('cluster.list.filteringAriaLabel')}
          filteringPlaceholder={t('cluster.list.filteringPlaceholder')}
        />
      }
      selectedItems={(items || []).filter(
        cluster => cluster.clusterName === selectedClusterName,
      )}
      onSelectionChange={onSelectionChangeCallback}
    />
  )
}

const clustersSlug = 'clusters'
export default function Clusters() {
  const clusterName = useState(['app', 'clusters', 'selected'])
  const [splitOpen, setSplitOpen] = React.useState(true)
  const {t} = useTranslation()
  let {data: clusters} = useQuery('LIST_CLUSTERS', ListClusters, {
    refetchInterval: 5000,
  })

  const selectedClusterName = useState(['app', 'clusters', 'selected'])
  const oldStatus = useState(['app', 'clusters', 'selectedStatus'])
  let navigate = useNavigate()

  useHelpPanel(<ClustersHelpPanel />)

  useEffect(
    () => onClustersUpdate(selectedClusterName, clusters!, oldStatus, navigate),
    [selectedClusterName, oldStatus, clusters, navigate],
  )

  return (
    <Layout
      pageSlug={clustersSlug}
      splitPanelOpen={splitOpen}
      onSplitPanelToggle={e => {
        setSplitOpen(e.detail.open)
      }}
      splitPanel={
        <SplitPanel
          i18nStrings={{
            preferencesTitle: t('global.splitPanel.preferencesTitle'),
            preferencesPositionLabel: t(
              'global.splitPanel.preferencesPositionLabel',
            ),
            preferencesPositionDescription: t(
              'global.splitPanel.preferencesPositionDescription',
            ),
            preferencesPositionSide: t(
              'global.splitPanel.preferencesPositionSide',
            ),
            preferencesPositionBottom: t(
              'global.splitPanel.preferencesPositionBottom',
            ),
            preferencesConfirm: t('global.splitPanel.preferencesConfirm'),
            preferencesCancel: t('global.splitPanel.preferencesCancel'),
            closeButtonAriaLabel: t('global.splitPanel.closeButtonAriaLabel'),
            openButtonAriaLabel: t('global.splitPanel.openButtonAriaLabel'),
            resizeHandleAriaLabel: t('global.splitPanel.resizeHandleAriaLabel'),
          }}
          header={
            clusterName
              ? `Cluster: ${clusterName}`
              : t('cluster.list.splitPanel.noClusterSelectedText')
          }
        >
          {clusterName ? (
            <Details />
          ) : (
            <div>{t('cluster.list.splitPanel.selectClusterText')}</div>
          )}
        </SplitPanel>
      }
    >
      <ClusterList clusters={clusters!} />
    </Layout>
  )
}

const CLUSTERS_HELP_PANEL_LIST = [
  <Trans key="cluster.help.details" i18nKey="cluster.help.details" />,
  <Trans key="cluster.help.instances" i18nKey="cluster.help.instances" />,
  <Trans key="cluster.help.storage" i18nKey="cluster.help.storage" />,
  <Trans key="cluster.help.scheduling" i18nKey="cluster.help.scheduling" />,
  <Trans key="cluster.help.accounting" i18nKey="cluster.help.accounting" />,
  <Trans key="cluster.help.events" i18nKey="cluster.help.events" />,
  <Trans key="cluster.help.logs" i18nKey="cluster.help.logs" />,
]

const ClustersHelpPanel = () => {
  const {t} = useTranslation()
  const footerLinks = useMemo(
    () => [
      {
        title: t('global.help.configurationProperties.title'),
        href: t('global.help.configurationProperties.href'),
      },
      {
        title: t('cluster.help.dcvLink.title'),
        href: t('cluster.help.dcvLink.href'),
      },
      {
        title: t('global.help.ec2ConnectLink.title'),
        href: t('global.help.ec2ConnectLink.href'),
      },
      {
        title: t('cluster.help.accountingLink.title'),
        href: t('cluster.help.accountingLink.href'),
      },
      {
        title: t('cluster.help.logsLink.title'),
        href: t('cluster.help.logsLink.href'),
      },
    ],
    [t],
  )
  return (
    <TitleDescriptionHelpPanel
      title={<Trans i18nKey="cluster.list.header.title" />}
      description={
        <Trans i18nKey="cluster.help.main">
          <ul>
            {CLUSTERS_HELP_PANEL_LIST.map(detail => (
              <li key={detail.key}>{detail}</li>
            ))}
          </ul>
        </Trans>
      }
      footerLinks={footerLinks}
    />
  )
}
