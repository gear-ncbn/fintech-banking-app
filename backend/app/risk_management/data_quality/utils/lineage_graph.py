"""Data Lineage Graph Builder"""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class NodeType(StrEnum):
    TABLE = "table"
    VIEW = "view"
    FILE = "file"
    STREAM = "stream"
    API = "api"
    REPORT = "report"
    DASHBOARD = "dashboard"


class EdgeType(StrEnum):
    DIRECT = "direct"
    TRANSFORM = "transform"
    AGGREGATE = "aggregate"
    FILTER = "filter"
    JOIN = "join"
    UNION = "union"


@dataclass
class LineageNode:
    node_id: str
    node_name: str
    node_type: NodeType
    database: str = ""
    schema_name: str = ""
    description: str = ""
    owner: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class LineageEdge:
    edge_id: str
    source_node_id: str
    target_node_id: str
    edge_type: EdgeType
    transformation: str = ""
    column_mappings: list[dict[str, str]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class LineagePath:
    path_id: str
    nodes: list[str]
    edges: list[str]
    total_hops: int
    start_node: str
    end_node: str


class LineageGraphBuilder:
    def __init__(self):
        self._nodes: dict[str, LineageNode] = {}
        self._edges: dict[str, LineageEdge] = {}
        self._adjacency_list: dict[str, list[str]] = {}
        self._reverse_adjacency_list: dict[str, list[str]] = {}
        self._edge_counter = 0

    def add_node(
        self,
        node_id: str,
        node_name: str,
        node_type: NodeType,
        database: str = "",
        schema_name: str = "",
        description: str = "",
        owner: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> LineageNode:
        node = LineageNode(
            node_id=node_id,
            node_name=node_name,
            node_type=node_type,
            database=database,
            schema_name=schema_name,
            description=description,
            owner=owner,
            metadata=metadata or {},
        )
        self._nodes[node_id] = node

        if node_id not in self._adjacency_list:
            self._adjacency_list[node_id] = []
        if node_id not in self._reverse_adjacency_list:
            self._reverse_adjacency_list[node_id] = []

        return node

    def add_edge(
        self,
        source_node_id: str,
        target_node_id: str,
        edge_type: EdgeType,
        transformation: str = "",
        column_mappings: list[dict[str, str]] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> LineageEdge:
        self._edge_counter += 1
        edge_id = f"edge_{self._edge_counter:06d}"

        edge = LineageEdge(
            edge_id=edge_id,
            source_node_id=source_node_id,
            target_node_id=target_node_id,
            edge_type=edge_type,
            transformation=transformation,
            column_mappings=column_mappings or [],
            metadata=metadata or {},
        )
        self._edges[edge_id] = edge

        if source_node_id not in self._adjacency_list:
            self._adjacency_list[source_node_id] = []
        self._adjacency_list[source_node_id].append(target_node_id)

        if target_node_id not in self._reverse_adjacency_list:
            self._reverse_adjacency_list[target_node_id] = []
        self._reverse_adjacency_list[target_node_id].append(source_node_id)

        return edge

    def get_upstream_nodes(self, node_id: str, max_depth: int = 10) -> list[LineageNode]:
        visited = set()
        result = []
        self._traverse_upstream(node_id, visited, result, 0, max_depth)
        return result

    def _traverse_upstream(
        self, node_id: str, visited: set[str], result: list[LineageNode], depth: int, max_depth: int
    ) -> None:
        if depth >= max_depth or node_id in visited:
            return

        visited.add(node_id)
        upstream_ids = self._reverse_adjacency_list.get(node_id, [])

        for upstream_id in upstream_ids:
            if upstream_id in self._nodes and upstream_id not in visited:
                result.append(self._nodes[upstream_id])
                self._traverse_upstream(upstream_id, visited, result, depth + 1, max_depth)

    def get_downstream_nodes(self, node_id: str, max_depth: int = 10) -> list[LineageNode]:
        visited = set()
        result = []
        self._traverse_downstream(node_id, visited, result, 0, max_depth)
        return result

    def _traverse_downstream(
        self, node_id: str, visited: set[str], result: list[LineageNode], depth: int, max_depth: int
    ) -> None:
        if depth >= max_depth or node_id in visited:
            return

        visited.add(node_id)
        downstream_ids = self._adjacency_list.get(node_id, [])

        for downstream_id in downstream_ids:
            if downstream_id in self._nodes and downstream_id not in visited:
                result.append(self._nodes[downstream_id])
                self._traverse_downstream(downstream_id, visited, result, depth + 1, max_depth)

    def find_all_paths(
        self, start_node_id: str, end_node_id: str, max_depth: int = 10
    ) -> list[LineagePath]:
        all_paths = []
        current_path = [start_node_id]
        visited = {start_node_id}
        self._find_paths_dfs(start_node_id, end_node_id, visited, current_path, all_paths, max_depth)
        return all_paths

    def _find_paths_dfs(
        self,
        current: str,
        end: str,
        visited: set[str],
        current_path: list[str],
        all_paths: list[LineagePath],
        max_depth: int,
    ) -> None:
        if len(current_path) > max_depth:
            return

        if current == end:
            path = LineagePath(
                path_id=f"path_{len(all_paths) + 1}",
                nodes=current_path.copy(),
                edges=self._get_edges_for_path(current_path),
                total_hops=len(current_path) - 1,
                start_node=current_path[0],
                end_node=current_path[-1],
            )
            all_paths.append(path)
            return

        for neighbor in self._adjacency_list.get(current, []):
            if neighbor not in visited:
                visited.add(neighbor)
                current_path.append(neighbor)
                self._find_paths_dfs(neighbor, end, visited, current_path, all_paths, max_depth)
                current_path.pop()
                visited.remove(neighbor)

    def _get_edges_for_path(self, path: list[str]) -> list[str]:
        edges = []
        for i in range(len(path) - 1):
            source = path[i]
            target = path[i + 1]
            for edge_id, edge in self._edges.items():
                if edge.source_node_id == source and edge.target_node_id == target:
                    edges.append(edge_id)
                    break
        return edges

    def get_root_nodes(self) -> list[LineageNode]:
        roots = []
        for node_id, node in self._nodes.items():
            if not self._reverse_adjacency_list.get(node_id):
                roots.append(node)
        return roots

    def get_leaf_nodes(self) -> list[LineageNode]:
        leaves = []
        for node_id, node in self._nodes.items():
            if not self._adjacency_list.get(node_id):
                leaves.append(node)
        return leaves

    def export_to_dict(self) -> dict[str, Any]:
        return {
            "nodes": [
                {
                    "node_id": n.node_id,
                    "node_name": n.node_name,
                    "node_type": n.node_type.value,
                    "database": n.database,
                    "schema_name": n.schema_name,
                    "owner": n.owner,
                }
                for n in self._nodes.values()
            ],
            "edges": [
                {
                    "edge_id": e.edge_id,
                    "source": e.source_node_id,
                    "target": e.target_node_id,
                    "edge_type": e.edge_type.value,
                    "transformation": e.transformation,
                }
                for e in self._edges.values()
            ],
            "statistics": {
                "total_nodes": len(self._nodes),
                "total_edges": len(self._edges),
                "root_nodes": len(self.get_root_nodes()),
                "leaf_nodes": len(self.get_leaf_nodes()),
            },
        }

    def clear(self) -> None:
        self._nodes.clear()
        self._edges.clear()
        self._adjacency_list.clear()
        self._reverse_adjacency_list.clear()
        self._edge_counter = 0


lineage_graph_builder = LineageGraphBuilder()
