// Libraries
import React, { ChangeEvent, FormEvent, useEffect, useMemo } from 'react';
import { useAsync } from 'react-use';

// Components
import { Input, InlineFieldRow, InlineField, Select, TextArea, Switch } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { StreamingClientEditor, ManualEntryEditor, RandomWalkEditor } from './components';

// Types
import { TestDataDataSource } from './datasource';
import { TestDataQuery, Scenario } from './types';
import { PredictablePulseEditor } from './components/PredictablePulseEditor';
import { CSVWaveEditor } from './components/CSVWaveEditor';
import { defaultQuery } from './constants';

const showLabelsFor = ['random_walk', 'predictable_pulse', 'predictable_csv_wave'];
const endpoints = [
  { value: 'datasources', label: 'Data Sources' },
  { value: 'search', label: 'Search' },
  { value: 'annotations', label: 'Annotations' },
];

// Fields that need to be transformed to numbers
const numberFields = ['lines'];

export interface EditorProps {
  onChange: any;
  query: TestDataQuery;
}

type Props = QueryEditorProps<TestDataDataSource, TestDataQuery>;

export const QueryEditor = ({ query, datasource, onChange, onRunQuery }: Props) => {
  const { loading, value: scenarioList } = useAsync<Scenario[]>(async () => {
    return datasource.getScenarios();
  }, []);

  useEffect(() => {
    onRunQuery();
  }, [query]);

  const currentScenario = useMemo(() => scenarioList?.find(scenario => scenario.id === query.scenarioId), [
    scenarioList,
    query,
  ]);
  const scenarioId = currentScenario?.id;

  const onScenarioChange = (item: SelectableValue<string>) => {
    const scenario = scenarioList?.find(sc => sc.id === item.value);

    if (!scenario) {
      return;
    }

    let stringInput = query.stringInput;

    if (scenario.id === 'grafana_api') {
      stringInput = stringInput || 'datasources';
    } else {
      stringInput = scenario.stringInput ?? '';
    }

    onChange({
      ...query,
      scenarioId: item.value!,
      stringInput,
    });
  };

  const onInputChange = (e: FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as HTMLInputElement | HTMLTextAreaElement;
    let newValue: Partial<TestDataQuery> = { [name]: value };

    if (name === 'levelColumn') {
      newValue = { levelColumn: (e.target as HTMLInputElement).checked };
    } else if (numberFields.includes(name)) {
      newValue = { [name]: Number(value) };
    }

    onChange({ ...query, ...newValue });
  };

  const onFieldChange = (field: string) => (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    onChange({ ...query, [field]: { ...query[field as keyof TestDataQuery], [name]: value } });
  };

  const onEndPointChange = ({ value }: SelectableValue) => {
    onChange({ ...query, stringInput: value });
  };

  const onStreamClientChange = onFieldChange('stream');
  const onPulseWaveChange = onFieldChange('pulseWave');
  const onCSVWaveChange = onFieldChange('csvWave');

  const options = useMemo(() => (scenarioList || []).map(item => ({ label: item.name, value: item.id })), [
    scenarioList,
  ]);
  const showLabels = useMemo(() => showLabelsFor.includes(query.scenarioId), [query]);

  if (loading) {
    return null;
  }

  query = { ...defaultQuery, ...query };
  return (
    <>
      <InlineFieldRow>
        <InlineField labelWidth={14} label="Scenario">
          <Select
            options={options}
            value={options.find(item => item.value === query.scenarioId)}
            onChange={onScenarioChange}
            width={32}
          />
        </InlineField>
        {currentScenario?.stringInput && (
          <InlineField label="String Input">
            <Input
              width={32}
              id="stringInput"
              name="stringInput"
              placeholder={query.stringInput}
              value={query.stringInput}
              onChange={onInputChange}
            />
          </InlineField>
        )}
        <InlineField label="Alias" labelWidth={14}>
          <Input
            width={32}
            id="alias"
            type="text"
            placeholder="optional"
            pattern='[^<>&\\"]+'
            name="alias"
            value={query.alias}
            onChange={onInputChange}
          />
        </InlineField>
        {showLabels && (
          <InlineField
            label="Labels"
            labelWidth={14}
            tooltip={
              <>
                Set labels using a key=value syntax:
                <br />
                {`{ key = "value", key2 = "value" }`}
                <br />
                key="value", key2="value"
                <br />
                key=value, key2=value
                <br />
              </>
            }
          >
            <Input
              width={32}
              id="labels"
              name="labels"
              onChange={onInputChange}
              value={query?.labels}
              placeholder="key=value, key2=value2"
            />
          </InlineField>
        )}
      </InlineFieldRow>

      {scenarioId === 'manual_entry' && <ManualEntryEditor onChange={onChange} query={query} onRunQuery={onRunQuery} />}
      {scenarioId === 'random_walk' && <RandomWalkEditor onChange={onInputChange} query={query} />}
      {scenarioId === 'streaming_client' && <StreamingClientEditor onChange={onStreamClientChange} query={query} />}
      {scenarioId === 'logs' && (
        <InlineFieldRow>
          <InlineField label="Lines" labelWidth={14}>
            <Input
              type="number"
              name="lines"
              value={query.lines}
              width={32}
              onChange={onInputChange}
              placeholder="10"
            />
          </InlineField>
          <InlineField label="Level" labelWidth={14}>
            <Switch onChange={onInputChange} name="levelColumn" value={!!query.levelColumn} />
          </InlineField>
        </InlineFieldRow>
      )}

      {scenarioId === 'grafana_api' && (
        <InlineField labelWidth={14} label="Endpoint">
          <Select
            options={endpoints}
            onChange={onEndPointChange}
            width={32}
            value={endpoints.find(ep => ep.value === query.stringInput)}
          />
        </InlineField>
      )}

      {scenarioId === 'arrow' && (
        <InlineField grow>
          <TextArea
            name="stringInput"
            value={query.stringInput}
            rows={10}
            placeholder="Copy base64 text data from query result"
            onChange={onInputChange}
          />
        </InlineField>
      )}

      {scenarioId === 'predictable_pulse' && <PredictablePulseEditor onChange={onPulseWaveChange} query={query} />}
      {scenarioId === 'predictable_csv_wave' && <CSVWaveEditor onChange={onCSVWaveChange} query={query} />}
    </>
  );
};
